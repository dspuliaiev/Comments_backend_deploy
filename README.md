# SPA-Comments

### Description
SPA-Comments is a full-featured single page application (SPA) designed to provide real-time dynamic user interaction. This project demonstrates the integration of a modern SPA frontend with a powerful Django backend.

## Technologies

- **Django**: a backend framework that offers a robust and scalable architecture for server-side logic.
- **Django REST Framework**: for building APIs.
- **Vue.js**: a reactive and dynamic front-end.
- **WebSockets**: from Django Channels to provide real-time bidirectional communication, allowing features such as real-time updates without requiring page reloads.
- **PostgreSQL**: as the underlying database for storing application data.
- **Redis**: for link layer binding in WebSockets, enabling efficient real-time message distribution.
- **Docker**: for containers that provide easy scalability and a consistent development environment.
- **Sort**: for sorting by fields such as date, Email, username.
- **Default LIFO sort**: 

## Installation
1. **Clone the repository**:
    ```bash
    git clone https://github.com/dspuliaiev/Comments_SPA    
    ```
2. **Make sure you have Poetry installed. Activate the Poetry virtual environment:**:
    ```bash
    poetry shell    
    ```
3. **Install dependencies**:
    ```bash
    poetry install    
    ```
    
4. **First terminal:**: (Make sure you have Docker installed) :**:
    ```bash
    docker-compose up     
   ```
   
5. **Second terminal**:
    ```bash
    python manage.py makemigrations
    python manage.py migrate
   ```

6. **Third terminal**:
    ```bash  
   daphne backend.asgi:application   
   ```

7. **Open http://localhost:8000 in a browser. You should see the main page.**:


