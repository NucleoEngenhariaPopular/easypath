## EasyPath Engine — O que dá vida ao chatbot

Serviço FastAPI responsável por executar fluxos conversacionais definidos em JSON. A cada mensagem do usuário, o Engine:
- carrega o fluxo, a sessão (stateless por padrão; Redis opcional para cache de sessão),
- decide o próximo caminho do fluxo usando um LLM,
- e gera a resposta do assistente.

Foi projetado para ser leve, simples de operar e facilmente testável.

### Visão geral do funcionamento
1. O cliente chama `POST /chat/message` com `session_id`, `flow_path` e `user_message`.
2. O Engine carrega (ou cria) a sessão no Redis (opcional) e lê o JSON do fluxo do `flow_path`.
3. `pathway_selector` decide o próximo nó (via LLM + fuzzy match de rótulos).
4. `flow_executor` formata o prompt do nó e chama o LLM para gerar a resposta.
5. A sessão é atualizada e persistida; a resposta é retornada.

---

## Como rodar localmente

Pré‑requisitos:
- Python 3.11+
- (Opcional) Redis em execução, se quiser persistir sessões

Opcional (recomendado) — Ambiente virtual no Windows PowerShell:

```powershell
cd C:\Users\pcampos\Desktop\projetos\nep\easypath\apps\engine
python -m venv .venv
.;\.venv\Scripts\Activate.ps1
```

Subir um Redis local (Docker), útil para persistência de sessão e testes:

```powershell
docker run --name easypath-redis -p 6379:6379 -d redis:7-alpine
```

1) Crie o arquivo `.env` a partir de `.env.example` e preencha as chaves necessárias (por exemplo, `DEEPSEEK_API_KEY` ou `GOOGLE_API_KEY`).

2) Instale as dependências (a partir do diretório `apps/engine`):

```bash
pip install -r requirements.txt
# opcional: dependências de desenvolvimento (tests)
pip install -r requirements-dev.txt
```

3) Suba o servidor (configurando variáveis e executando):

```powershell
# Escolha e configure o provedor de LLM
$env:LLM_PROVIDER = "deepseek"
$env:DEEPSEEK_API_KEY = "<SUA_CHAVE>"   # se usar deepseek
# $env:LLM_PROVIDER = "gemini"
# $env:GOOGLE_API_KEY = "<SUA_CHAVE>"    # se usar gemini (modo api)
$env:LOG_LEVEL = "INFO"

uvicorn app.main:app --reload --port 8081
```

4) Verifique a saúde do serviço:

```bash
curl http://localhost:8081/health/
```

5) Envie uma mensagem de chat (exemplo):

```bash
curl -X POST http://localhost:8081/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sessao-123",
    "flow_path": "C:/caminho/para/flow.json",
    "user_message": "Olá!"
  }'
```

Observação: o `flow_path` deve apontar para um arquivo JSON compatível com o schema de `app/models/flow.py`. Há um exemplo em `apps/engine/tests/fixtures/sample_flow.json`.

---

## Variáveis de ambiente (.env)

- `LOG_LEVEL` (default: INFO): nível de logs.
- `REDIS_URL`: URL do Redis (ex.: `redis://localhost:6379/0`). Se não definido, o Engine roda stateless.
- Seletor de LLM:
  - `LLM_PROVIDER` (default: deepseek): `deepseek` ou `gemini`.
- DeepSeek:
  - `DEEPSEEK_API_KEY`: chave da API DeepSeek.
- Gemini (via google‑genai):
  - `GEMINI_PROVIDER_MODE`: `api` (padrão) ou `vertex`.
  - `GOOGLE_API_KEY`: necessário quando `GEMINI_PROVIDER_MODE=api`.
  - `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GEMINI_MODEL`: usados conforme o modo/configuração.

Veja `.env.example` para uma lista completa.

---

## Endpoints

- `GET /health/` → status do serviço
- `GET /health/ping` → ping/pong
- `POST /chat/message` → processa uma mensagem do usuário
  - Body JSON:
    - `session_id`: string que identifica a sessão
    - `flow_path`: caminho absoluto do arquivo JSON do fluxo
    - `user_message`: texto da mensagem do usuário
- `GET /flow/load?file_path=...` → carrega e retorna o JSON do fluxo (útil para debug)

---

## Estrutura de pastas (tour pelo Engine)

- `app/main.py`: cria o app FastAPI, configura logs e registra as rotas.

- `app/api/`
  - `routes/health.py`: endpoints de saúde (`/health`).
  - `routes/chat.py`: endpoint de chat (`/chat/message`). Orquestra carregamento de sessão/fluxo e chama o núcleo.
  - `routes/flow.py`: endpoint utilitário para ler um fluxo do disco.
  - `dependencies.py`: dependências de injeção (ex.: cliente Redis).

- `app/core/`
  - `orchestrator.py`: coordena um passo da conversa (atualiza sessão, decide próximo nó e gera resposta).
  - `pathway_selector.py`: monta o prompt e consulta o LLM para escolher o próximo caminho; usa fuzzy matching para validar a opção.
  - `flow_executor.py`: formata o prompt de acordo com o nó corrente e chama o LLM para obter a resposta do assistente.
  - `chat_manager.py`: utilitários para criar/gerenciar sessões.

- `app/llm/`
  - `base.py`: contratos (`LLMClient`, `LLMResult`).
  - `deepseek.py`: cliente HTTP para DeepSeek.
  - `gemini.py`: cliente para Google Gemini (biblioteca `google-genai`). Suporta modos `api` e `vertex`.
  - `providers.py`: seleciona o provedor com base em `LLM_PROVIDER`.

- `app/models/`
  - `flow.py`: define o schema do fluxo (entidades `Prompt`, `Node`, `Connection`, `Flow`).
  - `session.py`: `ChatSession` e histórico de mensagens.
  - `message.py`: modelo de mensagem.
  - `node.py`: estado de nós (auxiliar).

- `app/services/`
  - `message_service.py`: helpers de mensagem (ex.: formatação para LLM).

- `app/storage/`
  - `redis_client.py`: cliente assíncrono para Redis.
  - `session_store.py`: persistência de sessão em Redis (JSON serializado).
  - `flow_repository.py`: carregamento de fluxos a partir de arquivo.

- `app/utils/`
  - `logging.py`: configuração básica de logs.

- `tests/`
  - `unit/`: testes unitários do core e modelos.
  - `integration/`: testes de API usando `TestClient`.
  - `fixtures/`: arquivos de exemplo (ex.: `sample_flow.json`).

- `Dockerfile`: imagem mínima (Python 3.11‑slim) que instala dependências e executa `uvicorn`.
- `requirements.txt` e `requirements-dev.txt`: dependências de runtime e de desenvolvimento.

---

## Executando com Docker

No diretório `apps/engine`:

```bash
docker build -t easypath-engine .
docker run --rm -p 8081:8081 --env-file .env easypath-engine
```

Se for usar Redis, disponibilize-o para o container (ex.: via rede do Docker) e configure `REDIS_URL` adequadamente.

Na raiz do repositório existe um `docker-compose.yml` que pode ser usado para orquestrar serviços (consulte-o se desejar rodar Redis junto).

---

## Rodando os testes

Passo a passo (Windows PowerShell) a partir de `apps/engine`:

```powershell
# 1) (opcional, mas recomendado) ativar ambiente virtual
python -m venv .venv
.;\.venv\Scripts\Activate.ps1

# 2) instalar dependências
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3) preparar .env (se ainda não existir)
copy .env.example .env

# 4) subir um Redis local (se ainda não estiver rodando)
docker run --name easypath-redis -p 6379:6379 -d redis:7-alpine

# 5) executar testes (unitários + integração)
pytest -q

# (opcionais) filtros úteis
pytest -q tests/unit
pytest -q tests/integration
```

Notas:
- Os testes “mockam” chamadas ao LLM para garantir reprodutibilidade.
- O Redis é usado para persistir sessões durante os cenários de integração. Se não houver Redis acessível em `redis://localhost:6379/0`, os testes de integração podem falhar.

---

### Diferenças entre testes unitários e de integração (Pytest)

- Unidade (tests/unit):
  - Escopo: funções/classes isoladas do domínio (ex.: `orchestrator`, `models`).
  - Dependências externas: evitadas. LLM e I/O são simulados com monkeypatch/mocks.
  - Velocidade: muito rápidos e determinísticos.
  - Objetivo: validar regras de negócio e contratos internos sem efeitos colaterais.
  - Rodar: `pytest -q tests/unit`

- Integração (tests/integration):
  - Escopo: fluxo HTTP da API via `fastapi.TestClient` e integração entre módulos (`api` + `core` + `storage`).
  - Dependências externas: pode exigir Redis ativo; LLM costuma ser “mockado”. Pode ler arquivos de fluxo.
  - Velocidade: mais lentos e sujeitos a ambiente (ex.: disponibilidade do Redis).
  - Objetivo: validar se os componentes funcionam juntos e os endpoints respondem como esperado.
  - Rodar: `pytest -q tests/integration`

Recomendações:
- Crie/ajuste testes unitários para cobrir novas regras de negócio.
- Utilize integração para validar endpoints e contratos entre camadas (com Redis rodando).
- Use `-k` no Pytest para filtrar casos: `pytest -q -k "test_nome"`.

---

## Exemplos de fluxo

Use `apps/engine/tests/fixtures/sample_flow.json` como referência para criar seus próprios fluxos. O schema completo está em `app/models/flow.py`.

---

## Dicas e boas práticas

- Mantenha seus fluxos declarativos e bem descritos (rótulos e descrições claros nas conexões ajudam o seletor de caminhos).
- Ajuste `temperature` por nó para controlar a criatividade do LLM.
- Em produção, configure `LOG_LEVEL=INFO` ou superior e monitore latências dos provedores LLM.
