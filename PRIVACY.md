# Política de Privacidade — Planalto Moderno
*(Privacy Policy — Planalto Moderno)*

> **Última atualização / Last updated:** 2 de novembro de 2026 (November 2, 2026)

---

## 1. Visão Geral (Overview)

O **Planalto Moderno** é uma extensão de navegador de código aberto desenvolvida para aprimorar a legibilidade, navegação e estudo de legislações públicas hospedadas no portal oficial brasileiro `www.planalto.gov.br`.

A sua privacidade e a segurança dos seus dados são princípios fundamentais do projeto. **O Planalto Moderno NÃO coleta, não armazena, não rastreia, não vende e não compartilha dados de identificação pessoal, dados analíticos ou histórico de navegação com nenhum servidor próprio ou intermediário.**

---

## 2. Dados Manipulados e Armazenamento Local (Data Handling & Local Storage)

Todas as funcionalidades do Planalto Moderno operam sob o modelo **estritamente local no cliente (Client-Side Only)**:

1. **Anotações e Grifos de Estudo:** Suas marcações de texto, cores de grifo personalizadas, tags e notas de estudo sobre artigos de lei são gravadas exclusivamente no armazenamento interno do seu próprio navegador através da API `storage.local`. Nenhum desses dados é sincronizado com servidores externos.
2. **Preferências de Leitura e Aparência:** Suas preferências de tema (claro, sépia, escuro), tamanho de fonte, espaçamento tipográfico e fontes selecionadas permanecem armazenadas no dispositivo local.
3. **Chaves de API de Inteligência Artificial (Modelo BYOKey - Traga Sua Própria Chave):** Caso você opte por utilizar os recursos de inteligência artificial (explicação didática, chat jurídico contextual, análise de edital em PDF e simulado de questões), sua chave de API pessoal (Google Gemini, OpenAI, Anthropic Claude, OpenRouter ou Groq) é guardada localmente de forma isolada no seu navegador. Ela **nunca** é transmitida a servidores do desenvolvedor ou intermediários não autorizados.

---

## 3. Comunicações com Serviços de Terceiros (Third-Party Services)

O Planalto Moderno estabelece conexões de rede exclusivamente nos seguintes cenários:

1. **Requisições de IA sob Demanda do Usuário:** Quando você clica ativamente para solicitar uma explicação, gerar uma questão ou enviar uma mensagem no chat, o trecho do artigo ou edital em análise é enviado diretamente pelo seu navegador aos endpoints oficiais do provedor de IA escolhido por você:
   - Google Generative AI (Gemini): [Política de Privacidade do Google](https://policies.google.com/privacy)
   - OpenAI: [Política de Privacidade da OpenAI](https://openai.com/privacy)
   - Anthropic: [Política de Privacidade da Anthropic](https://www.anthropic.com/privacy)
   - OpenRouter: [Política de Privacidade do OpenRouter](https://openrouter.ai/privacy)
   - Groq: [Política de Privacidade da Groq](https://groq.com/privacy-policy/)
2. **Pesquisa Externa de Jurisprudência e Bancos de Questões:** Ao clicar em botões para pesquisar jurisprudência ou questões externas (STF, STJ, Jusbrasil, Gran, Tec Concursos), a extensão apenas abre uma nova aba com a consulta pública pré-formatada. Nenhum dado de conta ou credencial é transmitido.
3. **Fontes Web Tipográficas:** As fontes tipográficas opcionais são carregadas via Google Fonts e CDN pública jsDelivr durante a renderização do leitor. Nenhuma informação pessoal além dos cabeçalhos padrão HTTP de requisição de arquivos web é processada.

---

## 4. Permissões Solicitadas e Justificativas (Permissions & Justifications)

Em conformidade com a política de Privilégio Mínimo (Least Privilege) do Google Chrome e da Mozilla:
- `storage` e `unlimitedStorage`: Usadas estritamente para gravar suas notas, grifos e preferências locais sem risco de perda de dados.
- `host_permissions` para `*.planalto.gov.br`: Necessária para que a extensão possa ler a estrutura HTML da legislação e apresentar a visualização moderna e o sumário.
- `host_permissions` para provedores de IA: Necessárias exclusivamente para viabilizar chamadas diretas às APIs de inteligência artificial configuradas voluntariamente pelo usuário.

---

## 5. Exclusão e Controle dos Dados (User Control & Data Deletion)

Você possui controle total sobre todos os seus dados:
- É possível exportar ou excluir suas notas e grifos a qualquer momento através do menu do **Caderno** da extensão.
- Caso desinstale a extensão do navegador, todos os dados locais associados ao Planalto Moderno (incluindo chaves de API salvas e anotações locais) serão permanentemente removidos pelo próprio navegador.

---

## 6. Alterações a Esta Política (Policy Updates)

Quaisquer atualizações futuras nesta política serão publicadas neste mesmo endereço com a respectiva revisão de data. Nenhuma versão futura comprometerá a política de não rastreamento de dados de usuários.

---

## 7. Contato e Código Aberto (Contact & Open Source)

O Planalto Moderno é um software livre e transparente. Em caso de dúvidas sobre privacidade, segurança ou funcionamento da extensão, entre em contato através da seção de issues do repositório no GitHub ou pelo e-mail de suporte do desenvolvedor.
