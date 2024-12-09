// csrf.js
function getCsrfToken() {
    const csrfTokenCookie = document.cookie
        .split('; ')
        .find(cookie => cookie.startsWith("csrftoken="));

    if (csrfTokenCookie) {
        return csrfTokenCookie.split("=")[1];
    }
    return null;
}

axios.interceptors.request.use(config => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
});