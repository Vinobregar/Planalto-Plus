# Planalto Moderno — Extensão para Leitura Jurídica & IA (Chrome & Firefox)

Extensão multiplataforma para **Google Chrome** e **Mozilla Firefox** que moderniza a visualização de legislações no portal [www.planalto.gov.br](https://www.planalto.gov.br).

---

## Como Instalar e Rodar

### 1. Gerar os pacotes de distribuição
```bash
npm install
npm run build
```

O comando compila o projeto e gera automaticamente as versões completas e idênticas para ambos os navegadores na pasta `dist/`:
* **Chrome**: pasta `dist/chrome/` (ou `dist/`) e pacote compactado `dist/planalto-moderno-chrome.zip`
* **Firefox**: pasta `dist/firefox/` e pacotes `dist/planalto-moderno-firefox.zip` / `dist/planalto-moderno-firefox.xpi`

Você também pode compilar alvos específicos:
```bash
npm run build:firefox  # Apenas versão Firefox
npm run build:chrome   # Apenas versão Chrome
npm run build:all      # Ambas as versões
```

---

### 2. Instalação no Mozilla Firefox

1. Abra o Firefox e digite na barra de endereços:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Na seção **Extensões temporárias** (*Temporary Extensions*), clique em **Carregar extensão temporária...** (*Load Temporary Add-on...*).
3. Selecione o arquivo `manifest.json` dentro da pasta **`dist/firefox`** (ou selecione diretamente o pacote **`dist/planalto-moderno-firefox.zip`** / **`.xpi`**).
4. Pronto! A extensão estará ativa no Firefox com todas as permissões, scripts e recursos WebAssembly configurados.

---

### 3. Instalação no Google Chrome / Chromium (Brave, Edge, Opera)

1. Abra o navegador e acesse:
   ```text
   chrome://extensions/
   ```
2. Ative a chave **Modo do desenvolvedor** (*Developer mode*) no canto superior direito.
3. Clique em **Carregar sem compactação** (*Load unpacked*) e selecione a pasta **`dist/chrome`** (ou a pasta **`dist`** raiz).
4. Pronto! A extensão estará carregada e pronta para uso.

---

## Principais Funcionalidades (Idênticas no Chrome e Firefox)

1. **Leitor Jurídico Moderno & Modo Texto Compilado**
   - Converte automaticamente páginas de leis, decretos, códigos e a Constituição Federal em blocos tipográficos estruturados (`Epígrafe`, `Ementa`, `Parte > Livro > Título > Capítulo > Seção > Subseção`, `Artigos`, `Parágrafos`, `Incisos`, `Alíneas` e `Penas`).
   - Botão **Texto Compilado** na barra superior para ocultar/recolher instantaneamente dispositivos revogados (`<strike>`) e indicar expressamente incisos revogados cujo caput continua em vigor.
   - Remissões legislativas (ex.: `(Redação dada pela Lei nº 13.146, de 2015)`) transformadas em links de tooltip discretos.
   - Alternância instantânea com 1 clique para a **Versão Original do Planalto**.

2. **Sumário Hierárquico Centralizado & Navegação**
   - Árvore hierárquica completa com expansão/recolhimento e busca em tempo real.
   - Barra de busca duplicada centralizada na barra superior.
   - Dropdown no topo esquerdo para trocar rapidamente entre as principais leis federais (CF/88, Código Civil, Código Penal, CPC, CPP, CLT, CDC, LBI, Lei de Recuperação Judicial, etc.).

3. **Aparência, Acessibilidade & Tipografia**
   - Temas **Claro**, **Sépia** (com slider de intensidade do filtro) e **Escuro** (com slider de intensidade do preto / OLED puro).
   - Famílias tipográficas de alta legibilidade: **Inter Sans**, **Merriweather Serif**, **Atkinson Hyperlegible** e **OpenDyslexic**.
   - Sliders para controle fino de tamanho de fonte, espaçamento entre parágrafos, altura da linha e largura de coluna.

4. **Caderno de Estudos (Grifos & Tags + Anotações)**
   - Sistema de grifos personalizáveis com personalização de cores e vinculação a tags de estudo ("OAB", "Concursos", "Importante", etc.).
   - Anotações ricas por artigo.
   - Exportação completa em **Markdown (`.md`)** e **JSON**.
   - Geração e exportação de **Flashcards** para **Anki (`.apkg` nativo via SQLite WebAssembly)**, **.csv** e **RemNote (`.rem`)**.

5. **Jurisprudência & Pesquisa Avançada**
   - Pesquisa pré-formatada por dispositivo no STF, STJ, Jusbrasil e Google Acadêmico.
   - Busca em bancos externos de questões por citação de artigo ou trecho literal.

6. **Inteligência Artificial**
   - Suporte a múltiplos provedores por Chave API (Google Gemini, OpenAI, Anthropic Claude, OpenRouter, Groq).
   - Importação de **Edital de Concurso (PDF)** com grifo automatizado dos artigos mais incidentes.
   - Gerador de simulados e questões com parametrização de dificuldade e banca.
