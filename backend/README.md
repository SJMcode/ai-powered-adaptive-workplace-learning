Run the backend locally

1) Create and activate a virtual environment

Linux/macOS
```
python3 -m venv .aiagent
source .aiagent/bin/activate
```

Windows (PowerShell)
```
py -3 -m venv .aiagent
.aiagent\\Scripts\\Activate.ps1
```

2) Install dependencies
```
pip install -r backend/requirements.txt
```

3) Start Ollama and pull a model
```
ollama serve
ollama pull llama3.1
```

4) Run the API
```
uvicorn backend.main:app --reload --port 8000
```


