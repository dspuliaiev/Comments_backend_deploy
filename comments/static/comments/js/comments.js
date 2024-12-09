// comments.js
new Vue({
    el: '#app',
    data: {
        page: 1,
        total_pages: 1,
        comments: [], // Инициализация массива комментариев
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
            'user_name': 'Имени',
            'email': 'E-mail',
            'date_added': 'Дате',
        },
    },
    methods: {
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
        getCaptcha() {
            axios.get('/get_captcha/')
                .then(response => {
                    this.commentForm.captcha = response.data;
                })
                .catch(error => {
                    console.error('Ошибка при получении капчи:', error);
                });
        },
        updateComments() {
            axios.get('/api/v1/comments/')
                .then(response => {
                    this.comments = response.data.comments;
                })
                .catch(error => {
                    console.error('Ошибка при загрузке данных:', error);
                });
        },
        sanitizeHTML(html) {
            return DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['a', 'code', 'i', 'strong'],
                ALLOWED_ATTR: ['href', 'title'],
            });
        },
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
        loadPage(page) {
            axios.get(`/api/v1/comments/?page=${page}`)
                .then(response => {
                    this.comments = response.data.comments;
                    this.page = response.data.page;
                    this.total_pages = response.data.total_pages;
                })
                .catch(error => {
                    console.error('Ошибка при загрузке данных:', error);
                });
        },
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
                    this.comments = response.data.comments;
                })
                .catch(error => {
                    console.error('Ошибка при загрузке данных:', error);
                });
            const button = event.target;
            button.textContent = `${this.sortButtonTexts[currentSortBy]} (${currentOrder === 'asc' ? '↑' : '↓'})`;
        },
        handleImageUpload(event) {
            this.commentForm.image = event.target.files[0];
        },
        handleFileUpload(event) {
            this.commentForm.file = event.target.files[0];
        },
        showCommentForm() {
            if (this.showForm) {
                this.showForm = false;
            } else {
                this.showForm = true;
                this.getCaptcha();
            }
        },
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

            const postURL = '/api/v1/comments/create/';
            let config = {
                header: {
                    'Content-Type': 'multipart/form-data',
                },
            };
            axios.post(postURL, formData, config)
                .then(response => {
                    this.showForm = false;
                    this.updateComments(); // Обновляем список комментариев
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

    // Устанавливаем WebSocket-соединение
    const socket = new WebSocket('wss://comments-spa.koyeb.app/ws/chat/');

    socket.onopen = (event) => {
        console.log('Соединение установлено');
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            if (message.type === 'new_comment' && message.data) {
                const newComment = message.data;

                // Проверка структуры нового комментария
                if (typeof newComment.is_root === 'undefined') {
                    console.error('Свойство is_root отсутствует у комментария:', newComment);
                    return;
                }

                if (newComment.is_root) {
                    // Добавляем корневой комментарий в начало списка (LIFO)
                    this.comments.unshift(newComment);
                } else {
                    // Обновляем дочерний комментарий
                    const parentComment = this.findCommentById(newComment.parent_comment_id);

                    if (parentComment) {
                        if (!Array.isArray(parentComment.children)) {
                            parentComment.children = [];
                        }
                        parentComment.children.unshift(newComment);  // Добавляем в начало дочерних комментариев
                    } else {
                        console.warn('Родительский комментарий не найден для:', newComment);
                    }
                }

                console.log('Комментарии после обновления:', this.comments);
            } else {
                console.error('Некорректные данные WebSocket:', message);
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения WebSocket:', error);
        }
    };

    },
});
