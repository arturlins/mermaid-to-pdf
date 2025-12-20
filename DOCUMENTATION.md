# Documentação do Projeto Mermaid-to-PDF

Este documento descreve a estrutura do projeto e detalha o funcionamento dos principais arquivos e módulos. O projeto é uma aplicação web construída com Next.js 16, React 19 e Tailwind CSS, focada em converter diagramas Mermaid.js em arquivos PDF vetoriais de alta qualidade.

## Estrutura de Arquivos

Abaixo está a descrição da estrutura de diretórios e arquivos do projeto:

```
.
├── eslint.config.mjs       # Configuração do ESLint para linting do código.
├── next.config.ts          # Configurações do Next.js (e.g., headers, plugins).
├── next-env.d.ts           # Definições de tipos TypeScript automáticas do Next.js.
├── package.json            # Dependências, scripts e metadados do projeto.
├── package-lock.json       # Versões exatas das dependências instaladas.
├── postcss.config.mjs      # Configuração do PostCSS (usado pelo Tailwind CSS).
├── public/                 # Arquivos estáticos servidos diretamente.
│   ├── file.svg            # Ícone de arquivo.
│   ├── globe.svg           # Ícone de globo.
│   ├── next.svg            # Logotipo do Next.js.
│   ├── vercel.svg          # Logotipo da Vercel.
│   └── window.svg          # Ícone de janela.
├── README.md               # Documentação principal e guia de início rápido.
├── src/                    # Código fonte da aplicação.
│   └── app/                # App Router do Next.js.
│       ├── api/            # Rotas de API (Backend/Serverless Functions).
│       │   └── generate-pdf/
│       │       └── route.ts # Endpoint para geração de PDF (Server-side).
│       ├── favicon.ico     # Ícone da aba do navegador.
│       ├── globals.css     # Estilos globais e configuração do Tailwind.
│       ├── layout.tsx      # Layout raiz da aplicação (Header, Fonts, etc).
│       └── page.tsx        # Página principal (Frontend/UI).
├── tailwind.config.ts      # Configuração do tema e plugins do Tailwind CSS.
├── test.mmd                # Arquivo de exemplo mermaid para testes.
├── tsconfig.json           # Configuração do compilador TypeScript.
└── tsconfig.tsbuildinfo    # Cache de build do TypeScript.
```

---

## Detalhamento dos Arquivos Principais

### 1. `src/app/api/generate-pdf/route.ts`
**Tipo:** Backend API Route (Next.js App Router).
**Função:** Responsável por receber o código Mermaid e gerar o arquivo PDF.

Este arquivo implementa uma Serverless Function que utiliza o Puppeteer para renderizar o diagrama em um navegador "headless" (sem interface gráfica) e imprimir o PDF.

**Principais Módulos:**
-   **`puppeteer-core`**: Versão leve do Puppeteer para controlar o Chrome/Chromium.
-   **`@sparticuz/chromium-min`**: Pacote otimizado do Chromium binário projetado para rodar em ambientes Serverless (AWS Lambda/Vercel) onde o tamanho do pacote é crítico.
-   **`puppeteer`**: Pacote completo usado apenas em desenvolvimento local (inclui o binário do Chrome).

**Fluxo de Execução (`POST`):**
1.  **Detecção de Ambiente**: Verifica `process.env.NODE_ENV`.
    -   **Desenvolvimento (`development`)**: Usa `puppeteer` padrão instalada localmente.
    -   **Produção**: Usa `puppeteer-core` + `@sparticuz/chromium-min` via URL remota do binário.
2.  **Inicialização do Browser**: Lança uma instância do navegador Chromium.
3.  **Criação da Página HTML**:
    -   Injeta o script do Mermaid.js via CDN (`https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js`).
    -   Insere o código mermaid recebido dentro de um bloco `<pre class="mermaid">`.
    -   Configura estilos CSS para garantir que o diagrama renderize corretamente.
4.  **Renderização**: Aguarda o seletor `svg` aparecer na página (sinal que o Mermaid renderizou o gráfico).
5.  **Cálculo de Dimensões (Smart Sizing)**:
    -   Executa um script na página (`page.evaluate`) para medir o tamanho exato (`getBoundingClientRect`) do elemento SVG gerado.
    -   Adiciona uma pequena margem (padding) de 40px.
6.  **Geração do PDF**: Chama `page.pdf()` configurando `width` e `height` iguais ao tamanho do SVG, garantindo um PDF perfeitamente ajustado ("Fit to Page").
7.  **Resposta**: Retorna o buffer do PDF com o cabeçalho `Content-Type: application/pdf` para download direto.

### 2. `src/app/page.tsx`
**Tipo:** Frontend Component (Client Component - `'use client'`).
**Função:** A interface principal do usuário, contendo o editor, visualização em tempo real e controles.

Gerencia todo o estado da aplicação no lado do cliente, validação de sintaxe e interação com a API.

**Principais Módulos:**
-   **`mermaid`**: Biblioteca Mermaid.js rodando no navegador para o "Live Preview".
-   **`react`**: `useState`, `useEffect`, `useRef` para gerenciamento de estado e DOM.
-   **`framer-motion`**: Animações de entrada, transições e feedback visual.
-   **`lucide-react`**: Ícones da interface (Upload, Download, etc).

**Funcionalidades Detalhadas:**
-   **Renderização em Tempo Real (`useEffect`)**: Monitora mudanças na variável `code`. A cada alteração (com debounce de 300ms), tenta renderizar o diagrama usando `mermaid.render()`.
    -   Se falhar (`catch`), marca a sintaxe como inválida (`syntaxValid = false`).
    -   Se tiver sucesso, injeta o SVG gerado na `div` de preview.
    -   **Configuração Crítica**: Força `flowchart: { htmlLabels: false }` para garantir que o texto seja SVG puro, evitando problemas de compatibilidade com alguns leitores ou conversores.
-   **Drag & Drop**: Implementa manipuladores de eventos (`onDrop`, `onDragOver`, etc.) para aceitar arquivos `.md` e `.mmd`.
    -   Lê o arquivo com `FileReader`.
    -   Usa Regex (`/```mermaid\s*([\s\S]*?)\s*```/`) para extrair blocos mermaid de arquivos Markdown, ou lê o arquivo inteiro se for `.mmd`.
-   **Conversão e Download**:
    -   Ao clicar em "Convert Now", envia o código para a API `/api/generate-pdf`.
    -   Recebe o `Blob` do PDF e cria uma URL temporária (`URL.createObjectURL`) para forçar o download no navegador.

### 3. `src/app/layout.tsx`
**Tipo:** Root Layout (Server Component).
**Função:** Define a estrutura base HTML compartilhada por todas as páginas.

**Detalhes:**
-   **Fonte**: Carrega a fonte **Outfit** do Google Fonts (`next/font/google`) e a aplica globalmente via classe CSS no `<body>`.
-   **Estilos Base**: Importa `./globals.css`.
-   **Tema Escuro e Gradiente**: Aplica classes Tailwind no `<body>` para definir o fundo escuro padrão e o gradiente radial sutil (`bg-[radial-gradient...]`).
-   **Metadados**: Define o título da aba (`Mermaid to PDF`) e descrição para SEO.

### 4. `src/app/globals.css`
**Tipo:** Global Stylesheet (CSS/Tailwind).
**Função:** Define as variáveis de tema (cores), configurações do Tailwind e estilos globais reset.

**Estrutura:**
-   **Diretivas Tailwind**: `@tailwind base`, `@tailwind components`, `@tailwind utilities`.
-   **Variáveis CSS (`:root` e `.dark`)**: Define o sistema de design usando variáveis CSS compatíveis com componentes "shadcn/ui" ou similares.
    -   A classe `.dark` contém as cores do tema "Lead" (cinza azulado escuro/roxo) usado na aplicação.
    -   Exemplo: `--background: 222 20% 12%;` (um azul muito escuro, quase preto).
    -   Exemplo: `--primary: 263.4 70% 60%;` (um roxo vibrante para destaque).
-   **Reset Global**: Aplica cores de fundo e texto padrão ao `body` e bordas padrão a todos os elementos (`* { @apply border-border; }`).
