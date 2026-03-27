import './style.css';
import * as monaco from 'monaco-editor';

interface FileModel {
  id: string;
  name: string;
  language: string;
  value: string;
}

type Mode = 'web' | 'swiftui';

const defaultFiles: Record<Mode, FileModel[]> = {
  web: [
    {
      id: 'html',
      name: 'index.html',
      language: 'html',
      value: `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Demo live</title>
  </head>
  <body>
    <main class="card">
      <span class="badge">V1 online</span>
      <h1>Ciao Anthony 👋</h1>
      <p>
        Questo è il tuo primo preview live via browser. HTML e CSS vengono renderizzati
        in tempo reale nel pannello di destra.
      </p>
      <button>Spaccaossa mode</button>
    </main>
  </body>
</html>`
    },
    {
      id: 'css',
      name: 'styles.css',
      language: 'css',
      value: `:root {
  color-scheme: light dark;
  font-family: Inter, system-ui, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top right, #6ea8ff, transparent 35%),
    radial-gradient(circle at bottom left, #8b5cf6, transparent 28%),
    #0f172a;
  color: white;
}

.card {
  width: min(540px, calc(100% - 32px));
  padding: 28px;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.35);
}

.badge {
  display: inline-block;
  margin-bottom: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(52, 88, 255, 0.24);
  font-size: 12px;
  font-weight: 700;
}

h1 {
  margin: 0 0 12px;
  font-size: 40px;
}

p {
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}

button {
  margin-top: 18px;
  padding: 12px 16px;
  border: 0;
  border-radius: 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}`
    }
  ],
  swiftui: [
    {
      id: 'swift',
      name: 'ContentView.swift',
      language: 'swift',
      value: `import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Browser IDE")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Questa modalità è già pronta come editor, ma il render SwiftUI reale arriverà in una fase successiva.")
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Anteprima futura") {
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}`
    }
  ]
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root non trovato.');

registerSwiftLanguage();

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-badge">I</div>
        <div>
          <h1>Browser IDE V1</h1>
          <p>Editor a sinistra, render live a destra</p>
        </div>
      </div>
      <div class="controls">
        <select class="select" id="modeSelect" aria-label="Modalità progetto">
          <option value="web">HTML + CSS</option>
          <option value="swiftui">SwiftUI (editor pronto)</option>
        </select>
        <button class="secondary-button" id="resetButton" type="button">Reset demo</button>
        <button class="primary-button" id="renderButton" type="button">Render now</button>
      </div>
    </header>
    <main class="workspace" id="workspace">
      <section class="panel">
        <div class="panel-header">
          <h2>Code editor</h2>
          <span id="editorInfo">Monaco Editor</span>
        </div>
        <div class="editor-grid">
          <div class="file-tabs" id="fileTabs"></div>
          <div class="editor-root" id="editorRoot"></div>
        </div>
      </section>
      <div class="drag-handle" aria-hidden="true"></div>
      <section class="panel">
        <div class="panel-header">
          <h2>Live preview</h2>
          <span id="previewInfo">iframe sandbox</span>
        </div>
        <div class="preview-root" id="previewRoot"></div>
      </section>
    </main>
    <footer class="statusbar">
      <div id="statusLeft">Ready.</div>
      <div id="statusRight">V1 · preview locale in memoria</div>
    </footer>
  </div>
`;

const modeSelect = document.querySelector<HTMLSelectElement>('#modeSelect');
const resetButton = document.querySelector<HTMLButtonElement>('#resetButton');
const renderButton = document.querySelector<HTMLButtonElement>('#renderButton');
const fileTabs = document.querySelector<HTMLDivElement>('#fileTabs');
const editorRoot = document.querySelector<HTMLDivElement>('#editorRoot');
const previewRoot = document.querySelector<HTMLDivElement>('#previewRoot');
const statusLeft = document.querySelector<HTMLDivElement>('#statusLeft');
const editorInfo = document.querySelector<HTMLSpanElement>('#editorInfo');
const previewInfo = document.querySelector<HTMLSpanElement>('#previewInfo');

if (!modeSelect || !resetButton || !renderButton || !fileTabs || !editorRoot || !previewRoot || !statusLeft || !editorInfo || !previewInfo) {
  throw new Error('UI incompleta.');
}

let currentMode: Mode = 'web';
let files: FileModel[] = cloneFiles(defaultFiles.web);
let activeFileId = files[0].id;

const modelMap = new Map<string, monaco.editor.ITextModel>();
const editor = monaco.editor.create(editorRoot, {
  automaticLayout: true,
  minimap: { enabled: false },
  theme: 'vs-dark',
  fontSize: 15,
  roundedSelection: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  wordWrap: 'on'
});

function cloneFiles(source: FileModel[]): FileModel[] {
  return source.map((file) => ({ ...file }));
}

function bootModels(): void {
  disposeModels();
  modelMap.clear();

  for (const file of files) {
    const model = monaco.editor.createModel(file.value, file.language);
    model.onDidChangeContent(() => {
      file.value = model.getValue();
      if (currentMode === 'web') {
        renderPreview();
      } else {
        renderSwiftPlaceholder();
      }
    });
    modelMap.set(file.id, model);
  }
}

function disposeModels(): void {
  for (const model of modelMap.values()) {
    model.dispose();
  }
}

function renderTabs(): void {
  fileTabs.innerHTML = '';

  for (const file of files) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `file-tab${file.id === activeFileId ? ' active' : ''}`;
    button.textContent = file.name;
    button.addEventListener('click', () => {
      activeFileId = file.id;
      bindActiveModel();
      renderTabs();
    });
    fileTabs.appendChild(button);
  }
}

function bindActiveModel(): void {
  const model = modelMap.get(activeFileId);
  if (!model) return;
  editor.setModel(model);
}

function composeHtmlPreview(): string {
  const html = files.find((file) => file.id === 'html')?.value ?? '';
  const css = files.find((file) => file.id === 'css')?.value ?? '';

  const styleTag = `<style>${css}</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  }

  return `${styleTag}\n${html}`;
}

function renderPreview(): void {
  previewRoot.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'preview-frame';
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.srcdoc = composeHtmlPreview();
  previewRoot.appendChild(iframe);
  statusLeft.innerHTML = `<span class="status-ok">Preview aggiornato</span> · ${new Date().toLocaleTimeString('it-IT')}`;
  editorInfo.textContent = 'HTML / CSS';
  previewInfo.textContent = 'iframe sandbox · srcdoc';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderSwiftPlaceholder(): void {
  const swiftCode = files[0]?.value ?? '';
  previewRoot.innerHTML = `
    <div class="preview-empty">
      <div>
        <p><strong>Modalità SwiftUI pronta lato editor.</strong></p>
        <p>
          In V1 la preview reale non è ancora implementata. Il prossimo step sarà un renderer dedicato o una pipeline compatibile WebAssembly.
        </p>
        <pre style="margin-top:16px; padding:16px; text-align:left; background:#0b1020; border-radius:16px; overflow:auto; max-width:100%; color:#d7def0; border:1px solid #232833;"><code>${escapeHtml(swiftCode)}</code></pre>
      </div>
    </div>
  `;
  statusLeft.innerHTML = `<span class="status-warn">Preview SwiftUI non ancora attiva</span>`;
  editorInfo.textContent = 'Swift / SwiftUI';
  previewInfo.textContent = 'placeholder tecnico';
}

function resetCurrentMode(): void {
  files = cloneFiles(defaultFiles[currentMode]);
  activeFileId = files[0].id;
  bootModels();
  bindActiveModel();
  renderTabs();
  if (currentMode === 'web') {
    renderPreview();
  } else {
    renderSwiftPlaceholder();
  }
}

modeSelect.addEventListener('change', () => {
  currentMode = modeSelect.value as Mode;
  resetCurrentMode();
});

resetButton.addEventListener('click', () => {
  resetCurrentMode();
});

renderButton.addEventListener('click', () => {
  if (currentMode === 'web') {
    renderPreview();
  } else {
    renderSwiftPlaceholder();
  }
});

window.addEventListener('beforeunload', () => {
  disposeModels();
  editor.dispose();
});

bootModels();
bindActiveModel();
renderTabs();
renderPreview();

function registerSwiftLanguage(): void {
  if (monaco.languages.getLanguages().some((language) => language.id === 'swift')) {
    return;
  }

  monaco.languages.register({ id: 'swift' });
  monaco.languages.setMonarchTokensProvider('swift', {
    keywords: [
      'import', 'struct', 'class', 'enum', 'protocol', 'extension', 'func', 'var', 'let', 'if', 'else', 'for', 'while', 'return',
      'some', 'View', 'body', 'Button', 'Text', 'VStack', 'HStack', 'ZStack'
    ],
    tokenizer: {
      root: [
        [/\b[A-Z][\w$]*\b/, 'type.identifier'],
        [/\b[a-z_$][\w$]*\b/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
        [/".*?"/, 'string'],
        [/\/\/.*$/, 'comment'],
        [/\d+/, 'number'],
        [/[{}()[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/[;,.]/, 'delimiter']
      ]
    }
  });
}
