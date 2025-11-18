const Comment = {
    template: `
    <div class="comment-block">
        <div class="comment">
            <header>
                <div class="user-info">
                    <span class="user-name">{{ comment.user_name }}</span>
                    <span class="comment-date">{{ comment.created_at }}</span>
                </div>
            </header>
            <div class="comment-text" v-html="comment.text"></div>
            <div v-if="comment.text_file">
                <p>Текстовый файл: {{ getFileName(comment.text_file) }}
                    <a :href="getTextFileUrl(comment.text_file)" download>Скачать</a>
                </p>
            </div>
            <div v-if="comment.image">
                <img :src="getImageUrl(comment.image)" alt="Image" @mouseover="imageHover(true)" @mouseout="imageHover(false)">
            </div>
            <button class="reply" @click="showReplyForm(comment)">Ответить</button>
            <div v-if="replyToCommentId === comment.id">
                <section class="comment-form slide-in" id="ugcNewComment">
                    <h3 class="section-title">Оставьте ваш комментарий</h3>
                    <form @submit.prevent="submitComment">
                        {{ comment_form.non_field_errors }}
                        <div class="form-group">
                            <div class="form-field">
                                <label for="user_name">Имя:</label>
                                <input v-model="commentForm.user_name" type="text" id="user_name" class="form-control" placeholder="Ваше имя">
                            </div>
                            <div class="form-field">
                                <label for="home_page">Сайт:</label>
                                <input v-model="commentForm.home_page" type="text" id="home_page" class="form-control" placeholder="Ваш сайт">
                            </div>
                            <div class="form-field">
                                <label for="email">E-mail:</label>
                                <input v-model="commentForm.email" type="text" id="email" class="form-control" placeholder="youremail@example.com">
                            </div>
                            <div class="form-field">
                                <label for="text">Текст:</label>
                                <div class="tag-buttons">
                                    <button type="button" @click="insertTag('[i]')">[i]</button>
                                    <button type="button" @click="insertTag('[strong]')">[strong]</button>
                                    <button type="button" @click="insertTag('[code]')">[code]</button>
                                    <button type="button" @click="insertTag('[a]')">[a]</button>
                                </div>
                                <textarea v-model="commentForm.text" id="text" class="form-control" rows="6" cols="20" placeholder="Ваш комментарий"></textarea>
                            </div>
                            <div class="form-file">
                                <label for="image">Загрузить фото:</label>
                                <input type="file" id="image" class="custom-file-input" @change="handleImageUpload">
                            </div>
                            <div class="form-file">
                                <label for="text_file">Загрузить TXT-файл:</label>
                                <input type="file" id="text_file" name="text_file" class="custom-file-input" @change="handleFileUpload">
                            </div>
                            <div class="form-field">
                                <label for="captcha">Captcha:</label>
                            </div>
                            <div class="form-captcha-image">
                                <img v-if="commentForm.captcha" :src="commentForm.captcha.image_url" alt="Captcha">
                                <button class="captcha-button" type="button" @click="getCaptcha()">Обновить</button>
                            </div>
                            <div class="form-field">
                                <input v-model="commentForm.captcha.value" type="text" id="captcha" class="form-control" placeholder="Введите код с изображения">
                            </div>
                        </div>
                        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
                        <button type="submit">Отправить</button>
                    </form>
                </section>
            </div>
        </div>
        <div v-if="comment.children.length > 0">
            <ul>
                <li v-for="child_comment in comment.children">
                    <comment :comment="child_comment" :comment_form="comment_form" :show-comment-form="showCommentForm" />
                </li>
            </ul>
        </div>
    </div>
    `,
    props: ['comment', 'comment_form', 'showCommentForm'],
    data() {
        return {
            replyToCommentId: null,
            commentForm: {
                user_name: '',
                email: '',
                home_page: '',
                captcha: '',
                text: '',
                image: null,
                text_file: null,
            },
            errorMessage: '',
        };
    },
    methods: {
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
            this.$root.updateComments();
        },
        imageHover(shouldEnlarge) {
            const imageElement = document.querySelector('.comment img');
            if (shouldEnlarge) {
                imageElement.style.transform = 'scale(1.1)';
            } else {
                imageElement.style.transform = 'scale(1)';
            }
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
        getFileName(filePath) {
            return filePath.split('/').pop();
        },
        showReplyForm(comment) {
            if (this.replyToCommentId === comment.id) {
                this.replyToCommentId = null;
            } else {
                this.replyToCommentId = comment.id;
                if (!this.commentForm) {
                    this.commentForm = {};
                }
                this.getCaptcha();
            }
        },
        handleImageUpload(event) {
            this.commentForm.image = event.target.files[0];
        },
        handleFileUpload(event) {
            this.commentForm.file = event.target.files[0];
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
            formData.append('parent_comment', this.replyToCommentId);

            const postURL = '/api/v1/comments/create/';
            let config = {
                header: {
                    'Content-Type': 'multipart/form-data'
                }
            }
            axios.post(postURL, formData, config)
                .then(response => {
                    this.replyToCommentId = null;
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
        // Методы для обработки URL-адресов
        getImageUrl(url) {
            return this.$root.getImageUrl(url);
        },
        getTextFileUrl(url) {
            return this.$root.getTextFileUrl(url);
        },
    },
};

Vue.component('comment', Comment);