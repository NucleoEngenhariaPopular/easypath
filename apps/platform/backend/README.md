# Backend do EasyPath

Este serviço é o backend da plataforma EasyPath, construído com FastAPI. Ele é responsável por gerenciar os fluxos de conversação, usuários e outras lógicas de negócio da aplicação.

## Funcionalidades

- **Gerenciamento de Fluxos:** Criação, leitura, atualização e exclusão de fluxos de conversação.
- **Gerenciamento de Usuários:** Cadastro e autenticação de usuários.
- **Persistência de Dados:** Utiliza um banco de dados PostgreSQL para armazenar todas as informações.

## Como Executar

Para executar o backend, você precisa ter o Docker e o Docker Compose instalados. A partir da raiz do projeto, execute o seguinte comando:

```bash
docker-compose up --build backend
```

O serviço estará disponível em `http://localhost:8000`.