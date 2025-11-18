// Обновленный comments.js
new Vue({
    el: '#app',
    data: {
        page: 1,
        total_pages: 1,
        comments: [],
        showForm: false,
        commentForm: {
            user_name: '',
            email: '',
            home_page: '',
            captcha: '',
            text: '',
            image: null,
            text_file: null,
            csrf_token: '',
            sort_by: '',
            order: 'asc',
        },
        errorMessage: '',
        comment_form: {},
        sortButtonTexts: {
            'user_name': 'Name',
            'email': 'E-mail',
            'date_added': 'Date',
        },
    },
    methods: {
        // Метод для получения корректного пути для изображений
        getImageUrl(url) {
            console.log('Обрабатываем URL изображения:', url);
            if (!url) return '';

            // Удаляем лишний префикс, если он есть
            if (url.startsWith('image/upload/')) {
                url = url.replace('image/upload/', '');
            }

            const imageBasePath = 'https://res.cloudinary.com/dygbbg4nm/image/upload/';
            if (url.startsWith(imageBasePath)) {
                return url;
            }
            return url;
        },

        getTextFileUrl(url) {
            console.log('Обрабатываем URL текстового файла:', url);
            if (!url) return '';

            // Удаляем лишний префикс, если он есть
            if (url.startsWith('raw/upload/')) {
                url = url.replace('raw/upload/', '');
            }

            const fileBasePath = 'https://res.cloudinary.com/dygbbg4nm/raw/upload/';
            if (url.startsWith(fileBasePath)) {
                return url;
            }
            return url;
        },

        // Функция для поиска комментария по ID
        findCommentById(id, comments = this.comments) {
            for (const comment of comments) {
                if (comment.id === id) {
                    return comment;
                }
                if (Array.isArray(comment.children)) {
                    const found = this.findCommentById(id, comment.children);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        },

        // Получение капчи для формы
        getCaptcha() {
            axios.get('/get_captcha/')
                .then(response => {
                    this.commentForm.captcha = response.data;
                })
                .catch(error => {
                    console.error('Ошибка при получении капчи:', error);
                });
        },

        // Обновление списка комментариев
        updateComments() {
            axios.get('/api/v1/comments/')
                .then(response => {
                    this.comments = response.data.comments.map(comment => ({
                        ...comment,
                        image: this.getImageUrl(comment.image),
                        text_file: this.getTextFileUrl(comment.text_file),
                    }));
                })
                .catch(error => {
                    console.error('Ошибка при загрузке данных:', error);
                });
        },

        // Очистка и обработка HTML перед отправкой
        sanitizeHTML(html) {
            return DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['a', 'code', 'i', 'strong'],
                ALLOWED_ATTR: ['href', 'title'],
            });
        },

        // Вставка тегов в текст
        insertTag(tag) {
            const textArea = document.getElementById('text');
            const start = textArea.selectionStart;
            const end = textArea.selectionEnd;
            const text = this.commentForm.text;
            const textBeforeSelection = text.slice(0, start);
            const selectedText = text.slice(start, end);
            const textAfterSelection = text.slice(end);

            this.commentForm.text = textBeforeSelection + `<${tag.slice(1, -1)}>${selectedText}</${tag.slice(1, -1)}>` + textAfterSelection;
            textArea.selectionStart = start + tag.length + selectedText.length * 2;
            textArea.selectionEnd = textArea.selectionStart;
        },

        // Загрузка страницы комментариев
        loadPage(page) {
            axios.get(`/api/v1/comments/?page=${page}`)
                .then(response => {
                    this.comments = response.data.comments.map(comment => ({
                        ...comment,
                        image: this.getImageUrl(comment.image),
                        text_file: this.getTextFileUrl(comment.text_file),
                    }));
                    this.page = response.data.page;
                    this.total_pages = response.data.total_pages;
                })
                .catch(error => {
                    console.error('Ошибка при загрузке данных:', error);
                });
        },

        // Сортировка комментариев
        sortComments(sortBy) {
            let currentSortBy = sortBy;
            let currentOrder = 'asc';

            if (this.comment_form.sort_by === sortBy) {
                currentOrder = this.comment_form.order === 'asc' ? 'desc' : 'asc';
            }

            this.comment_form.sort_by = currentSortBy;
            this.comment_form.order = currentOrder;

            const postURL = `/api/v1/comments/?sort_by=${currentSortBy}&order=${currentOrder}`;

            axios.get(postURL)
                .then(response => {
                    this.comments = response.data.comments.map(comment => ({
                        ...comment,
                        image: this.getImageUrl(comment.image),
                        text_file: this.getTextFileUrl(comment.text_file),
                    }));
                })
                .catch(error => {
                    console.error('Ошибка при загрузке данных:', error);
                });

            const button = event.target;
            button.textContent = `${this.sortButtonTexts[currentSortBy]} (${currentOrder === 'asc' ? '↑' : '↓'})`;
        },

        // Обработка загрузки изображения
        handleImageUpload(event) {
            this.commentForm.image = event.target.files[0];
        },

        // Обработка загрузки файла
        handleFileUpload(event) {
            this.commentForm.file = event.target.files[0];
        },

        // Показать/спрятать форму комментариев
        showCommentForm() {
            this.showForm = !this.showForm;
            if (this.showForm) {
                this.getCaptcha();
            }
        },

        // Отправка комментария
        submitComment() {
            let formData = new FormData();
            formData.append('user_name', this.commentForm.user_name);
            formData.append('email', this.commentForm.email);
            formData.append('home_page', this.commentForm.home_page);
            formData.append('text', this.sanitizeHTML(this.commentForm.text));
            formData.append('captcha_value', this.commentForm.captcha.value);
            formData.append('captcha_key', this.commentForm.captcha.key);
            formData.append('image', this.commentForm.image);
            formData.append('text_file', this.commentForm.file);

            console.log('Данные перед отправкой:', Array.from(formData.entries()));

            const postURL = '/api/v1/comments/create/';
            let config = {
                header: {
                    'Content-Type': 'multipart/form-data',
                },
            };

            axios.post(postURL, formData, config)
                .then(response => {
                    this.showForm = false;
                    this.updateComments();
                })
                .catch(error => {
                    this.getCaptcha();
                    if (error.response && error.response.data) {
                        this.errorMessage = error.response.data.message;
                    } else {
                        this.errorMessage = 'Произошла ошибка при отправке комментария.';
                    }
                    console.error('Ошибка при отправке комментария:', error);
                });
        },
    },
    created() {
        this.updateComments();
        this.loadPage(1);

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        const socket = new WebSocket(`${protocol}://${host}/ws/chat/`);

        socket.onopen = () => {
            console.log('Соединение установлено');
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'new_comment' && message.data) {
                    const newComment = message.data;
                    newComment.image = this.getImageUrl(newComment.image);
                    newComment.text_file = this.getTextFileUrl(newComment.text_file);

                    if (newComment.is_root) {
                        this.comments.unshift(newComment);
                    } else {
                        const parentComment = this.findCommentById(newComment.parent_comment_id);
                        if (parentComment) {
                            if (!Array.isArray(parentComment.children)) {
                                parentComment.children = [];
                            }
                            parentComment.children.unshift(newComment);
                        } else {
                            console.warn('Родительский комментарий не найден для:', newComment);
                        }
                    }
                }
            } catch (error) {
                console.error('Ошибка обработки сообщения WebSocket:', error);
            }
        };
    },
});