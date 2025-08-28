# EasyPath

EasyPath is a comprehensive project focused on creating and managing chatbot conversation flows, designed to streamline and automate interactions, particularly those originating from platforms like WhatsApp.

## Como Executar o Projeto Completo

Para executar o projeto completo (frontend, backend e banco de dados), você precisa ter o Docker e o Docker Compose instalados. A partir da raiz do projeto, execute o seguinte comando:

```bash
docker-compose up --build
```

Isso irá construir e iniciar todos os serviços definidos no arquivo `docker-compose.yml`.

- O **Frontend** estará disponível em `http://localhost:5173`.
- O **Backend** estará disponível em `http://localhost:8000`.
- O **PostgreSQL** estará disponível na porta `5432`.