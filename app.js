const entradaUrlServidor = document.getElementById('serverUrl');
const botaoConectar = document.getElementById('connectBtn');
const elementoStatus = document.getElementById('status');
const listaMusicasEl = document.getElementById('songList');
const audioEl = document.getElementById('audio');
const tocandoAgoraEl = document.getElementById('nowPlaying');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeRange = document.getElementById('volumeRange');
const toggleThemeBtn = document.getElementById('toggleTheme');

let musicasDisponiveis = [];
let musicaAtualIndex = -1;
let isPlaying = false;

// Histórico de músicas tocadas
const historyList = [];

const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const closeMenu = document.getElementById('closeMenu');
menuToggle.onclick = () => sideMenu.classList.add('open');
closeMenu.onclick = () => sideMenu.classList.remove('open');

// compatibilidade: lê 'urlServidor' (novo) ou 'serverUrl' (antigo)
const urlSalva = localStorage.getItem('urlServidor') ?? localStorage.getItem('serverUrl');
if (urlSalva) entradaUrlServidor.value = urlSalva;

function juntarUrl(base, relativo) {
  try {
    return new URL(relativo, base).href;
  } catch {
    return base.replace(/\/+$/, '') + '/' + relativo.replace(/^\/+/, '');
  }
}

async function buscarJSON(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

function definirStatus(mensagem) {
  elementoStatus.textContent = mensagem;
}

botaoConectar.addEventListener('click', async () => {
  const base = entradaUrlServidor.value.trim().replace(/\/$/, '');
  if (!base) { definirStatus('Informe a URL do servidor.'); return; }

  // salva usando a nova chave e também a antiga (compat)
  localStorage.setItem('urlServidor', base);
  localStorage.setItem('serverUrl', base);

  definirStatus('Conectando…');
  try {
    const saude = await buscarJSON(juntarUrl(base, '/api/saude'));
    definirStatus(`Conectado. ${saude.count} músicas disponíveis.`);
    const musicas = await buscarJSON(juntarUrl(base, '/api/musicas'));
    renderizarMusicas(base, musicas);
  } catch (erro) {
    definirStatus('Falha ao conectar. Verifique a URL e a rede.');
    console.error(erro);
  }
});

function renderizarMusicas(base, musicas) {
  musicasDisponiveis = musicas;
  listaMusicasEl.innerHTML = '';
  if (!musicas.length) {
    listaMusicasEl.innerHTML = '<li>Nenhuma música encontrada no servidor.</li>';
    return;
  }

  musicas.forEach((musica, index) => {
    const li = document.createElement('li');

    const blocoMeta = document.createElement('div');
    blocoMeta.className = 'meta';

    const tituloEl = document.createElement('div');
    tituloEl.className = 'title';
    tituloEl.textContent = musica.title || '(Sem título)';

    const artistaEl = document.createElement('div');
    artistaEl.className = 'artist';
    artistaEl.textContent = musica.artist || 'Desconhecido';

    blocoMeta.appendChild(tituloEl);
    blocoMeta.appendChild(artistaEl);

    const botaoTocar = document.createElement('button');
    botaoTocar.textContent = 'Tocar';
    botaoTocar.addEventListener('click', () => {
      musicaAtualIndex = index;
      tocarMusica(base, musica);
    });

    li.appendChild(blocoMeta);
    li.appendChild(botaoTocar);
    listaMusicasEl.appendChild(li);
  });
}

function tocarMusica(base, musica) {
  const url = musica.url?.startsWith('http') ? musica.url : juntarUrl(base, musica.url);
  audioEl.src = url;
  audioEl.play().catch(console.error);
  tocandoAgoraEl.textContent = `Tocando: ${musica.title} — ${musica.artist}`;

  // Adiciona a música ao histórico
  if (!historyList.find(m => m.title === musica.title && m.artist === musica.artist)) {
    historyList.push(musica); // Adiciona a música tocada ao histórico
    renderizarHistorico();    // Re-renderiza o histórico
    localStorage.setItem('historyList', JSON.stringify(historyList)); // Salva no localStorage
  }
}

// Função para renderizar o histórico de músicas
function renderizarHistorico() {
  const historyListEl = document.getElementById('historyList');
  historyListEl.innerHTML = ''; // Limpa o histórico existente
  
  if (historyList.length === 0) {
    historyListEl.innerHTML = '<li>Nenhuma música tocada ainda.</li>';
    return;
  }

  historyList.forEach((musica) => {
    const li = document.createElement('li');
    li.textContent = `${musica.title} — ${musica.artist}`;
    historyListEl.appendChild(li);
  });
}

// Função para apagar o histórico
function apagarHistorico() {
  historyList.length = 0; // Limpa o array de histórico
  localStorage.removeItem('historyList'); // Remove o histórico do localStorage
  renderizarHistorico(); // Atualiza a interface para refletir a mudança
}

// Carregar histórico salvo no localStorage (se existir)
const savedHistoryList = localStorage.getItem('historyList');
if (savedHistoryList) {
  historyList.push(...JSON.parse(savedHistoryList)); // Recupera e preenche o histórico
  renderizarHistorico();  // Exibe o histórico carregado
}

// Botão para apagar o histórico
const btnApagarHistorico = document.getElementById('btnClearHistory');
btnApagarHistorico.addEventListener('click', apagarHistorico);

// Funcionalidades de controle de música
function formatarTempo(segundos) {
  const minutos = Math.floor(segundos / 60);
  const segs = Math.floor(segundos % 60);
  return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

function atualizarProgresso() {
  if (audioEl.duration) {
    const progresso = (audioEl.currentTime / audioEl.duration) * 100;
    progressBar.value = progresso;
    currentTimeEl.textContent = formatarTempo(audioEl.currentTime);
    totalTimeEl.textContent = formatarTempo(audioEl.duration);
  }
}

function tocarPausar() {
  if (isPlaying) {
    audioEl.pause();
    isPlaying = false;
  } else {
    audioEl.play().catch(console.error);
    isPlaying = true;
  }
}

function musicaAnterior() {
  if (musicaAtualIndex > 0) {
    musicaAtualIndex--;
    const base = localStorage.getItem('urlServidor');
    tocarMusica(base, musicasDisponiveis[musicaAtualIndex]);
  }
}

function proximaMusica() {
  if (musicaAtualIndex < musicasDisponiveis.length - 1) {
    musicaAtualIndex++;
    const base = localStorage.getItem('urlServidor');
    tocarMusica(base, musicasDisponiveis[musicaAtualIndex]);
  }
}

function retroceder() {
  audioEl.currentTime = Math.max(0, audioEl.currentTime - 10);
}

function avancar() {
  audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 10);
}

function alterarProgresso() {
  if (audioEl.duration) {
    const novoTempo = (progressBar.value / 100) * audioEl.duration;
    audioEl.currentTime = novoTempo;
  }
}

function alterarVolume() {
  audioEl.volume = volumeRange.value;
}

// Event listeners para controles de música
playPauseBtn.addEventListener('click', tocarPausar);
prevBtn.addEventListener('click', musicaAnterior);
nextBtn.addEventListener('click', proximaMusica);
rewindBtn.addEventListener('click', retroceder);
forwardBtn.addEventListener('click', avancar);
progressBar.addEventListener('input', alterarProgresso);
volumeRange.addEventListener('input', alterarVolume);

// Event listeners para o elemento de áudio
audioEl.addEventListener('timeupdate', atualizarProgresso);
audioEl.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatarTempo(audioEl.duration);
});
audioEl.addEventListener('play', () => {
  isPlaying = true;
});
audioEl.addEventListener('pause', () => {
  isPlaying = false;
});
audioEl.addEventListener('ended', proximaMusica);

// Funcionalidade de modo claro/escuro
function alternarTema() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('tema', isDark ? 'dark' : 'light');
  toggleThemeBtn.textContent = isDark ? '☀️' : '🌙';
}

// Carregar tema salvo
const temaSalvo = localStorage.getItem('tema');
if (temaSalvo === 'dark') {
  document.body.classList.add('dark-mode');
  toggleThemeBtn.textContent = '☀️';
} else {
  toggleThemeBtn.textContent = '🌙';
}

toggleThemeBtn.addEventListener('click', alternarTema);
