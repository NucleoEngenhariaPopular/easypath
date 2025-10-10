## EasyPath Engine — O que dá vida ao chatbot

Serviço FastAPI responsável por executar fluxos conversacionais definidos em JSON. A cada mensagem do usuário, o Engine:
- carrega o fluxo, a sessão (stateless por padrão; Redis opcional para cache de sessão),
- decide o próximo caminho do fluxo usando um LLM,
- e gera a resposta do assistente.

Foi projetado para ser leve, simples de operar e facilmente testável.

### Visão geral do funcionamento
1. O cliente chama `POST /chat/message` com `session_id`, `flow_path` e `user_message`.
2. O Engine carrega (ou cria) a sessão no Redis (opcional) e lê o JSON do fluxo do `flow_path`.
3. `variable_extractor` extrai variáveis da mensagem do usuário (se configurado).
4. **Loop automático de extração**: Se variáveis obrigatórias estão faltando, permanece no nó atual.
5. `loop_evaluator` avalia condições de loop explícitas (se `loop_enabled: true`).
6. **Loop de condição explícita**: Se a condição de loop é atendida, permanece no nó atual.
7. `pathway_selector` decide o próximo nó (via LLM + fuzzy match de rótulos) se não estiver em loop.
8. `flow_executor` formata o prompt do nó e chama o LLM para gerar a resposta.
9. A sessão é atualizada e persistida; a resposta é retornada.

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
  - `loop_evaluator.py`: avalia condições de loop explícitas usando LLM (retorna "LOOP" ou "PROCEED").
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

**IMPORTANTE:** Todos os comandos de teste devem ser executados a partir do diretório `apps/engine`.

Passo a passo (Windows PowerShell):

```powershell
# 0) Navegue até o diretório correto
cd apps/engine

# 1) (opcional, mas recomendado) ativar ambiente virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2) instalar dependências
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3) preparar .env (se ainda não existir)
copy .env.example .env

# 4) subir um Redis local (se ainda não estiver rodando)
docker run --name easypath-redis -p 6379:6379 -d redis:7-alpine

# 5) executar testes
pytest                              # Todos os testes
pytest -v                           # Modo verbose (mostra cada teste)
pytest -v --tb=short                # Com tracebacks curtos
pytest -q                           # Modo quiet (output mínimo)

# Filtros úteis
pytest tests/unit                   # Somente testes unitários
pytest tests/integration            # Somente testes de integração
pytest tests/unit/test_variable_extraction.py  # Arquivo específico
pytest -k "test_extract"            # Testes com nome contendo "test_extract"
pytest -k "not integration"         # Exclui testes de integração

# Cobertura de código
pytest --cov=app --cov-report=html  # Gera relatório HTML em htmlcov/
pytest --cov=app --cov-report=term  # Mostra cobertura no terminal

# Debug
pytest -v -s                        # Mostra prints/logs durante os testes
pytest --lf                         # Roda apenas testes que falharam na última execução
pytest --pdb                        # Abre debugger quando um teste falha
```

### Comandos Linux/MacOS (bash/zsh):

```bash
# 0) Navegue até o diretório correto
cd apps/engine

# 1) Ativar ambiente virtual
source .venv/bin/activate

# 2) Instalar dependências
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3) Preparar .env
cp .env.example .env

# 4) Subir Redis
docker run --name easypath-redis -p 6379:6379 -d redis:7-alpine

# 5) Executar testes (mesmos comandos pytest acima)
pytest -v
pytest tests/unit
pytest tests/integration
```

### Notas importantes:

- **Diretório de trabalho**: SEMPRE execute os testes a partir do diretório `apps/engine`. Se executar da raiz do projeto, os imports falharão.
- **Testes unitários**: "mockam" chamadas ao LLM para garantir reprodutibilidade e velocidade.
- **Testes de integração**: podem exigir Redis ativo em `redis://localhost:6379/0`.
- **Logs de teste**: Capturados automaticamente; use `-s` para ver em tempo real.
- **Logs do Engine**: Gravados em `logs/engine.log` com rotação automática (10MB, 5 backups).
- **Configuração**: O arquivo `pytest.ini` contém configurações úteis (markers, paths, logging).

---

### Diferenças entre testes unitários e de integração (Pytest)

#### Testes Unitários (`tests/unit/`)

**Escopo:** Funções/classes isoladas do domínio (ex.: `orchestrator`, `variable_extractor`, `models`).

**Características:**
- Dependências externas evitadas (LLM e I/O simulados com mocks/monkeypatch)
- Muito rápidos e determinísticos
- Não requerem Redis ou outros serviços externos

**Objetivo:** Validar regras de negócio e contratos internos sem efeitos colaterais.

**Executar:**
```bash
pytest tests/unit                              # Todos os testes unitários
pytest tests/unit/test_variable_extraction.py  # Teste específico de extração de variáveis
pytest tests/unit -v                           # Com output detalhado
```

**Exemplos de testes unitários:**
- `test_variable_extraction.py`: 43 testes cobrindo extração de variáveis, validações, retry logic, edge cases
- `test_loop_evaluator.py`: 11 testes cobrindo avaliação de condições de loop, parsing de respostas LLM, casos de erro
- `test_core.py`: Testes do orchestrator e flow executor
- `test_models.py`: Validação de modelos de dados

#### Testes de Integração (`tests/integration/`)

**Escopo:** Fluxo HTTP da API via `fastapi.TestClient` e integração entre módulos (`api` + `core` + `storage`).

**Características:**
- Pode exigir Redis ativo
- LLM geralmente "mockado" para reprodutibilidade
- Podem ler arquivos de fluxo reais
- Mais lentos e dependentes do ambiente

**Objetivo:** Validar se os componentes funcionam juntos e os endpoints respondem como esperado.

**Executar:**
```bash
pytest tests/integration                 # Todos os testes de integração
pytest tests/integration/test_api.py     # Testes específicos da API
pytest tests/integration -v              # Com output detalhado
```

**Exemplos de testes de integração:**
- `test_api.py`: Testes end-to-end do endpoint `/chat/message`
- Validação de fluxos completos com sessões Redis
- Testes de persistência e recuperação de estado

### Recomendações:

1. **Desenvolvimento de features:**
   - Comece com testes unitários para validar a lógica
   - Adicione testes de integração para validar o fluxo completo

2. **Debugging:**
   - Use `pytest -v -s` para ver logs em tempo real
   - Use `pytest --lf` para rodar apenas testes que falharam
   - Use `pytest --pdb` para debugar interativamente

3. **CI/CD:**
   - Rode testes unitários primeiro (rápidos)
   - Rode testes de integração em ambiente com Redis
   - Use `pytest --cov` para monitorar cobertura

4. **Filtros úteis:**
   ```bash
   pytest -k "test_extract"        # Testes de extração
   pytest -k "test_llm"            # Testes relacionados a LLM
   pytest -k "not integration"     # Apenas unitários
   ```

---

## Funcionalidade de Loops

O Engine suporta **dois tipos complementares de loops** que permitem que nós se repitam até que certas condições sejam atendidas:

### 1. Loop Automático de Extração de Variáveis
- **Gatilho:** Nó tem `extract_vars` com variáveis `required: true`
- **Comportamento:** Permanece no nó atual até que todas as variáveis obrigatórias sejam extraídas
- **Custo:** Gratuito (sem chamadas LLM adicionais)
- **Caso de uso:** Coletar informações do usuário (nome, email, idade, etc.)

**Exemplo:**
```json
{
  "id": "collect-name",
  "extract_vars": [
    {
      "name": "user_name",
      "description": "Nome completo do usuário",
      "required": true
    }
  ]
}
```

### 2. Loop de Condição Explícita (Baseado em LLM)
- **Gatilho:** Nó tem `loop_enabled: true` e `loop_condition` definido
- **Comportamento:** LLM avalia condição em linguagem natural, retorna "LOOP" ou "PROCEED"
- **Custo:** ~$0.00001-0.0001 por avaliação (~40-100 tokens)
- **Caso de uso:** Validação de respostas, perguntas de quiz, lógica condicional

**Exemplo:**
```json
{
  "id": "quiz-question",
  "loop_enabled": true,
  "loop_condition": "Continue perguntando até que o usuário responda '10' ou 'dez'. Dê dicas se estiver errado.",
  "prompt": {
    "objective": "Perguntar 'Quanto é 5 + 5?' e validar a resposta"
  }
}
```

### Ordem de Execução

Quando ambos os tipos de loop estão configurados no mesmo nó:

1. **Loop de Extração de Variáveis** (verificado primeiro)
   - Se variáveis obrigatórias estão faltando → loop (permanece no nó)
   - Se todas as variáveis obrigatórias estão presentes → continua para o passo 2

2. **Loop de Condição Explícita** (verificado segundo)
   - Só é avaliado se todas as variáveis obrigatórias estão presentes
   - LLM avalia `loop_condition` contra o histórico da conversa
   - Se condição retorna "LOOP" → loop (permanece no nó)
   - Se condição retorna "PROCEED" → continua para o passo 3

3. **Seleção de Caminho** (só se não estiver em loop)
   - Escolhe o próximo nó baseado nas conexões

### Recursos de Segurança

- **Fallback Seguro:** Erros do LLM ou respostas incertas retornam "PROCEED" (previne loops infinitos)
- **Condição Vazia Ignorada:** Se `loop_condition` é string vazia, loop é pulado
- **Desabilitado por Padrão:** `loop_enabled` padrão é `false`
- **Logging Abrangente:** Todas as avaliações de loop são registradas com raciocínio

### Métricas de Performance

Métricas de avaliação de loop são rastreadas nos dados de timing da resposta:
- `loop_evaluation_tokens`: Tokens de entrada/saída/total usados
- `loop_evaluation_time`: Tempo de execução em segundos
- `loop_evaluation_model`: Modelo usado para avaliação (ex.: "deepseek-chat")
- `loop_evaluation_cost_usd`: Custo estimado

Frontend exibe estatísticas de avaliação de loop no Modo de Teste quando tokens > 0.

### Exemplos de Casos de Uso

**Perguntas de Quiz/Teste:**
```json
{
  "id": "math-question",
  "loop_enabled": true,
  "loop_condition": "Repetir até que a resposta seja 'Paris'",
  "prompt": {
    "objective": "Perguntar: Qual é a capital da França?"
  }
}
```

**Validação de Idade:**
```json
{
  "id": "verify-age",
  "loop_enabled": true,
  "loop_condition": "Continuar até que user_age >= 18",
  "extract_vars": [{"name": "user_age", "required": true}]
}
```

**Veja `apps/engine/tests/fixtures/math_quiz_flow.json` para um exemplo completo com 3 perguntas progressivas.**

---

## Exemplos de fluxo

Use os seguintes arquivos de fixture como referência para criar seus próprios fluxos:
- `apps/engine/tests/fixtures/sample_flow.json` - Fluxo básico de exemplo
- `apps/engine/tests/fixtures/simple_extraction_flow.json` - Exemplo de extração de variáveis (reestruturado)
- `apps/engine/tests/fixtures/math_quiz_flow.json` - Quiz de matemática com 3 perguntas usando loops explícitos

O schema completo está em `app/models/flow.py`.

---

## Dicas e boas práticas

- Mantenha seus fluxos declarativos e bem descritos (rótulos e descrições claros nas conexões ajudam o seletor de caminhos).
- Ajuste `temperature` por nó para controlar a criatividade do LLM.
- **Use loops de extração automática** para coletar informações (gratuito, instantâneo).
- **Use loops de condição explícita** para validação de respostas e lógica condicional (baseado em LLM, flexível).
- Condições de loop são escritas em linguagem natural e avaliadas por LLM.
- Loops permanecem no mesmo nó (não são necessárias conexões de loop visual).
- Em produção, configure `LOG_LEVEL=INFO` ou superior e monitore latências dos provedores LLM.
- Monitore métricas de loop evaluation nos logs para otimizar custos.
