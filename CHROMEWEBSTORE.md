# Chrome Web Store & Firefox Add-ons Listing — Planalto Moderno

> Last Updated: 2026-11-02  
> Version: 1.0.0

---

## 1. Store Listing Details

**Extension Name** [REQUIRED]  
`Planalto Moderno — Leitura Jurídica & IA`

**Short Description** [REQUIRED] (Max 132 chars)  
`Moderniza o Planalto.gov.br com leitura limpa, sumário hierárquico, texto compilado, grifos, flashcards Anki e assistente de IA.`
*(129 caracteres)*

**Detailed Description** [REQUIRED]  
Transforme sua experiência de estudo e consulta às leis brasileiras no Planalto.gov.br. O Planalto Moderno substitui a visualização antiga por um leitor jurídico moderno, estruturado e livre de poluição visual.

Principais Recursos:

• Leitor Jurídico Estruturado: Converte leis, códigos e a Constituição em artigos, parágrafos e incisos claramente tipografados.  
• Modo Texto Compilado: Oculte dispositivos revogados com 1 clique e veja alertas sobre incisos alterados ou revogados.  
• Sumário Hierárquico Interativo: Navegue instantaneamente por Livros, Títulos, Capítulos e Artigos, ou busque por número e palavras-chave.  
• Caderno de Estudos Integrado: Faça anotações em cada artigo e organize grifos coloridos associados a tags ("OAB", "Concursos", "Importante").  
• Flashcards & Exportação Anki: Crie flashcards de estudo e exporte diretamente no formato nativo do Anki (.apkg), RemNote ou CSV.  
• Jurisprudência Rápida: Consulte decisões correlatas no STF, STJ e Jusbrasil com links contextuais diretos.  
• Inteligência Artificial sob Demanda: Conecte sua própria chave de API (Google Gemini, OpenAI, Claude ou Groq) para tirar dúvidas, resumir artigos e gerar simulados inéditos com gabarito comentado.  
• Acessibilidade & Conforto Visual: Temas Claro, Sépia e Escuro OLED, com controle de espaçamento e fontes hiperlegíveis (Atkinson Hyperlegible e OpenDyslexic).

Como Usar:
1. Instale a extensão no seu navegador.
2. Acesse qualquer lei ou código no portal oficial do Planalto (ex.: Constituição Federal, Código Civil, CLT, Código Penal).
3. A visualização moderna é ativada automaticamente, com sumário à esquerda, botões de estudo em cada artigo e alternância rápida para o texto original a qualquer momento.

Privacidade & Segurança:
• Suas anotações, grifos e chaves de API ficam gravadas exclusivamente na memória local do seu navegador.
• Nenhum dado pessoal, histórico ou informação de navegação é enviado a servidores externos de terceiros.

Suporte & Contato:
Tem dúvidas, sugestões ou solicitações? Envie seu feedback através do repositório no GitHub ou pelo canal de suporte oficial.

**Category** [REQUIRED]  
`Productivity` / `Productividade` (ou `Education` / `Educação` no Firefox)

**Single Purpose** [REQUIRED]  
`Moderniza a leitura, anotação e estudo de legislações no portal Planalto.gov.br.`

**Primary Language** [REQUIRED]  
`Portuguese (Brazil)`

---

## 2. Graphics & Assets

| Asset | Dimensions | Status | Filename / Location |
|---|---|---|---|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icons/icon-128.png` |
| Extension Icons | 16×16, 32×32, 48×48, 512×512 PNG | ✅ Ready | `public/icons/` |
| Screenshot 1 (Leitor & Sumário) [REQUIRED] | 1280×800 or 640×400 | ⬜ To capture | Capture `index.html` or `chrome-store-slides.html` slide 1 |
| Screenshot 2 (Texto Compilado & Badges) | 1280×800 or 640×400 | ⬜ To capture | Capture slide 2 |
| Screenshot 3 (Caderno de Grifos & Tags) | 1280×800 or 640×400 | ⬜ To capture | Capture slide 3 |
| Screenshot 4 (Simulado & Flashcards Anki) | 1280×800 or 640×400 | ⬜ To capture | Capture slide 4 |
| Screenshot 5 (Assistente de IA & Edital) | 1280×800 or 640×400 | ⬜ To capture | Capture slide 5 |
| Small Promo Tile [RECOMMENDED] | 440×280 PNG | ⬜ To capture | Use slide banner from `chrome-store-slides.html` |
| Marquee Promo Tile | 1400×560 PNG | ⬜ Optional | Optional promo banner |

> **Dica:** O arquivo [`chrome-store-slides.html`](file:///c:/Users/vinob/Documents/antigravity/splendid-bell/chrome-store-slides.html) deste repositório foi construído exatamente com as telas de demonstração nas dimensões da Chrome Web Store. Abra-o no navegador e faça a captura das telas para os slides.

---

## 3. Permissions Justification (Declaração para os Avaliadores)

Copie e cole estas justificativas exatas nos campos do painel de desenvolvedores:

| Permissão | Tipo | Justificativa em Português | Justification in English |
|---|---|---|---|
| `storage` | `permissions` | Necessária para persistir localmente no navegador do usuário as configurações de aparência (tema, fonte), tags de grifos, anotações de estudo e a chave de API de IA do próprio usuário. | Required to persist user appearance settings (theme, font), custom highlight tags, study notes, and the user's BYOKey AI configuration locally. |
| `unlimitedStorage` | `permissions` | Necessária para assegurar que cadernos de estudo extensos, notas de artigos e transcrições de editais de concurso possam ser armazenados sem interrupções por limites de cota local ao estudar múltiplos códigos e leis federais. | Required to ensure that extensive law study notebooks, article notes, and concurso edital text can be stored offline across multiple large legal codes without quota eviction. |
| `*://*.planalto.gov.br/*` | `host_permissions` | Permite que o leitor moderno estruture páginas de leis federais, decretos, códigos e a Constituição no portal oficial da legislação brasileira. | Allows the modern reader to format and display federal law, decree, code, and constitution pages on the official Brazilian legislation portal. |
| `https://generativelanguage.googleapis.com/*` | `host_permissions` | Permite a conexão direta entre o navegador do usuário e o Google Gemini quando o usuário solicita explicação de artigos, resolução de questões ou análise de edital usando sua própria chave. | Allows direct communication between the user's browser and Google Gemini API when the user explicitly requests AI article explanations or quiz generation using their own API key. |
| `https://api.openai.com/*` | `host_permissions` | Permite a conexão direta entre o navegador e a API da OpenAI para usuários que optam por utilizar modelos OpenAI como provedor de IA. | Allows direct communication between the browser and OpenAI API for users choosing OpenAI as their AI provider. |
| `https://api.anthropic.com/*` | `host_permissions` | Permite a conexão direta entre o navegador e a API da Anthropic para usuários que optam pelo Claude como provedor de IA. | Allows direct communication between the browser and Anthropic API for users choosing Claude as their AI provider. |
| `https://openrouter.ai/*` | `host_permissions` | Permite a conexão direta entre o navegador e a API do OpenRouter para usuários que utilizam chaves e modelos do OpenRouter. | Allows direct communication between the browser and OpenRouter API for users configuring OpenRouter models. |
| `https://api.groq.com/*` | `host_permissions` | Permite a conexão direta entre o navegador e a API da Groq para inferência de alta velocidade com modelos Llama/Mixtral. | Allows direct communication between the browser and Groq API for high-speed inference with user-provided Groq keys. |

---

## 4. Privacy & Data Use Disclosure (Formulário de Privacidade)

### Declaração de Coleta de Dados:
* **A extensão coleta dados pessoais do usuário?**  
  **NÃO.** O Planalto Moderno não coleta, não rastreia e não armazena dados de identificação pessoal, histórico de navegação nem endereços IP em nenhum servidor central.

### Respostas do Formulário da Chrome Web Store:
| Categoria de Dado | Coletado? | Transmitido para fora do dispositivo? | Finalidade | Compartilhado com Terceiros? |
|---|---|---|---|---|
| Informações Pessoais | Não | Não | — | Não |
| Informações Financeiras | Não | Não | — | Não |
| Informações de Saúde | Não | Não | — | Não |
| Credenciais / Autenticação | Não | Não | Chaves de API de IA do usuário são gravadas apenas localmente no `storage.local` e enviadas apenas para os provedores selecionados pelo usuário. | Não |
| Comunicações Pessoais | Não | Não | — | Não |
| Localização | Não | Não | — | Não |
| Histórico de Navegação | Não | Não | — | Não |
| Atividade do Usuário | Não | Não | — | Não |
| Conteúdo de Páginas Web | Sim (local) | Apenas sob demanda do usuário | O texto do artigo selecionado é enviado diretamente à API do provedor de IA escolhido pelo usuário para gerar o resumo/questão. | Apenas ao provedor de IA configurado pelo usuário no momento da requisição |

### Certificações Obrigatórias (Marcar todas com SIM no Dashboard):
- [x] O desenvolvedor garante que os dados do usuário NÃO são vendidos a terceiros.
- [x] O desenvolvedor garante que os dados do usuário NÃO são usados para fins não relacionados à funcionalidade principal da extensão.
- [x] O desenvolvedor garante que os dados do usuário NÃO são usados para determinar solvabilidade ou empréstimos.

---

## 5. Privacy Policy URL
Aponte o painel da loja para o documento público gerado em `PRIVACY.md` (hospedado no GitHub Pages, Gist público ou domínio próprio):
`https://[seu-usuario-github].github.io/[seu-repositorio]/PRIVACY.html` ou raw GitHub.
