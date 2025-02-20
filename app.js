// Funções de utilidade
function showMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Sistema de Banco de Dados Local
const DB = {
    save: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            return false;
        }
    },
    
    get: function(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Erro ao recuperar dados:', e);
            return null;
        }
    },
    
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Erro ao remover dados:', e);
            return false;
        }
    },
    
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Erro ao limpar dados:', e);
            return false;
        }
    }
};

// Sistema de notificações
const Toast = {
    container: null,
    
    init: function() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    
    show: function(message, type = 'success') {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Ícone baseado no tipo
        const icon = document.createElement('i');
        icon.className = 'fas ' + (type === 'success' ? 'fa-check-circle' : 
                                 type === 'error' ? 'fa-exclamation-circle' : 
                                 'fa-exclamation-triangle');
        
        const text = document.createElement('span');
        text.textContent = message;
        
        toast.appendChild(icon);
        toast.appendChild(text);
        this.container.appendChild(toast);
        
        // Remove o toast após 3 segundos
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = DB.get('currentUser');
    
    // Atualizar elementos da interface baseado no usuário logado
    if (currentUser) {
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = currentUser.nome;
            }
        });
    }
});

// Sistema de Triagem via Chatbot
const ChatBot = {
    initialized: false,
    currentQuestion: 0,
    respostas: {},
    perguntas: [
        {
            texto: "ATENÇÃO! \n\nPor favor, leia com atenção:\n\n1. Responda todas as perguntas com sinceridade\n2. Suas respostas afetarão diretamente seu tempo de atendimento\n3. Não será possível realizar nova triagem até que seu atendimento atual seja finalizado pelo médico\n\nVocê está de acordo?",
            tipo: "confirmacao"
        },
        {
            texto: "Ótimo! Vou iniciar a triagem agora. Confirme se você é [NOME]?",
            tipo: "simNao"
        },
        {
            texto: "Como está a intensidade da sua dor?",
            tipo: "opcoes",
            opcoes: ["Sem dor", "Dor leve", "Dor moderada", "Dor intensa", "Dor insuportável"],
            peso: {
                "Sem dor": 0,
                "Dor leve": 1,
                "Dor moderada": 3,
                "Dor intensa": 4,
                "Dor insuportável": 5
            }
        },
        {
            texto: "Onde está localizada a dor?",
            tipo: "opcoes",
            opcoes: ["Não tenho dor", "Cabeça", "Peito", "Abdômen", "Membros", "Outro"],
            peso: {
                "Não tenho dor": 0,
                "Cabeça": 3,
                "Peito": 5,
                "Abdômen": 4,
                "Membros": 2,
                "Outro": 2
            }
        },
        {
            texto: "Está com dificuldade para respirar?",
            tipo: "opcoes",
            opcoes: ["Não", "Leve", "Moderada", "Intensa"],
            peso: {
                "Não": 0,
                "Leve": 2,
                "Moderada": 3,
                "Intensa": 5
            }
        },
        {
            texto: "Qual sua temperatura atual?",
            tipo: "opcoes",
            opcoes: ["Normal (até 37.5°C)", "Febril (37.6°C a 38.5°C)", "Febre alta (acima de 38.5°C)", "Não sei informar"],
            peso: {
                "Normal (até 37.5°C)": 0,
                "Febril (37.6°C a 38.5°C)": 2,
                "Febre alta (acima de 38.5°C)": 4,
                "Não sei informar": 2
            }
        },
        {
            texto: "Está tendo vômitos?",
            tipo: "opcoes",
            opcoes: ["Não", "Raramente", "Frequentemente", "Muito frequente"],
            peso: {
                "Não": 0,
                "Raramente": 1,
                "Frequentemente": 2,
                "Muito frequente": 3
            }
        },
        {
            texto: "Sofreu algum trauma ou acidente?",
            tipo: "opcoes",
            opcoes: ["Não", "Sim, leve", "Sim, moderado", "Sim, grave"],
            peso: {
                "Não": 0,
                "Sim, leve": 2,
                "Sim, moderado": 3,
                "Sim, grave": 5
            }
        },
        {
            texto: "Tem alguma doença crônica?",
            tipo: "multiplo",
            opcoes: ["Não tenho", "Diabetes", "Hipertensão", "Cardíaco", "Asma/Bronquite", "Outra"],
            peso: {
                "Não tenho": 0,
                "Diabetes": 2,
                "Hipertensão": 2,
                "Cardíaco": 3,
                "Asma/Bronquite": 2,
                "Outra": 1
            }
        },
        {
            texto: "Está tomando alguma medicação?",
            tipo: "simNao",
            peso: 1
        },
        {
            texto: "Tem alergia a algum medicamento?",
            tipo: "simNao",
            peso: 2
        }
    ],

    init: function() {
        if (this.initialized) return; // Evita inicialização dupla
        
        const user = DB.get('currentUser');
        if (user) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.nome;
            }
            // Substituir [NOME] pelo nome do usuário na segunda pergunta
            this.perguntas[1].texto = this.perguntas[1].texto.replace('[NOME]', user.nome);
        }
        
        this.mostrarPergunta();
        this.configurarEventos();
        this.initialized = true;
    },

    mostrarPergunta: function() {
        const pergunta = this.perguntas[this.currentQuestion];
        
        // Destacar o aviso inicial em vermelho
        if (this.currentQuestion === 0) {
            const mensagem = document.createElement('div');
            mensagem.className = 'message bot-message warning';
            mensagem.innerHTML = pergunta.texto.replace(/\n/g, '<br>');
            document.getElementById('chatMessages').appendChild(mensagem);
        } else {
            this.adicionarMensagemBot(pergunta.texto);
        }

        const buttonGroup = document.getElementById('buttonGroup');
        const textInput = document.getElementById('textInput');

        // Limpar botões anteriores
        buttonGroup.innerHTML = '';
        
        if (pergunta.tipo === 'simNao' || pergunta.tipo === 'confirmacao') {
            buttonGroup.style.display = 'flex';
            textInput.style.display = 'none';
            
            const btnSim = document.createElement('button');
            btnSim.className = 'option-btn';
            btnSim.textContent = 'Sim';
            btnSim.dataset.value = 'sim';
            
            const btnNao = document.createElement('button');
            btnNao.className = 'option-btn';
            btnNao.textContent = 'Não';
            btnNao.dataset.value = 'nao';
            
            buttonGroup.appendChild(btnSim);
            buttonGroup.appendChild(btnNao);
        } else if (pergunta.tipo === 'opcoes' || pergunta.tipo === 'multiplo') {
            buttonGroup.style.display = 'flex';
            textInput.style.display = 'none';
            
            pergunta.opcoes.forEach(opcao => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opcao;
                btn.dataset.value = opcao;
                buttonGroup.appendChild(btn);
            });
        } else {
            buttonGroup.style.display = 'none';
            textInput.style.display = 'flex';
        }

        // Rolar para a última mensagem
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    adicionarMensagemBot: function(texto) {
        const mensagem = document.createElement('div');
        mensagem.className = 'message bot-message';
        mensagem.textContent = texto;
        document.getElementById('chatMessages').appendChild(mensagem);
        mensagem.scrollIntoView({ behavior: 'smooth' });
    },

    adicionarMensagemUsuario: function(texto) {
        const mensagem = document.createElement('div');
        mensagem.className = 'message user-message';
        mensagem.textContent = texto;
        document.getElementById('chatMessages').appendChild(mensagem);
        mensagem.scrollIntoView({ behavior: 'smooth' });
    },

    configurarEventos: function() {
        // Configurar botões Sim/Não
        const buttonGroup = document.getElementById('buttonGroup');
        buttonGroup.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) {
                const resposta = e.target.dataset.value;
                if (resposta) {
                    this.processarResposta(resposta);
                }
            }
        });

        // Configurar input de texto
        const sendBtn = document.getElementById('sendResponse');
        const input = document.getElementById('userResponse');

        if (sendBtn && input) {
            sendBtn.addEventListener('click', () => {
                const resposta = input.value.trim();
                if (resposta) {
                    this.processarResposta(resposta);
                    input.value = '';
                }
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const resposta = input.value.trim();
                    if (resposta) {
                        this.processarResposta(resposta);
                        input.value = '';
                    }
                }
            });
        }
    },

    processarResposta: function(resposta) {
        // Validar respostas específicas
        if (this.currentQuestion === 0 && resposta === 'nao') {
            this.adicionarMensagemBot("Você precisa concordar com os termos para prosseguir com a triagem.");
            return;
        }

        if (this.currentQuestion === 1 && resposta === 'nao') {
            this.adicionarMensagemBot("Por favor, verifique seus dados de cadastro ou faça login novamente.");
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            return;
        }

        // Salvar a resposta
        this.respostas[this.currentQuestion] = resposta;
        this.adicionarMensagemUsuario(resposta);

        // Processar resposta atual
        const perguntaAtual = this.perguntas[this.currentQuestion];
        if (perguntaAtual.tipo === 'multiplo') {
            // Para perguntas de múltipla escolha, permitir mais de uma resposta
            if (!Array.isArray(this.respostas[this.currentQuestion])) {
                this.respostas[this.currentQuestion] = [resposta];
            } else {
                this.respostas[this.currentQuestion].push(resposta);
            }
        }

        // Avançar para próxima pergunta com um pequeno delay
        setTimeout(() => {
            this.currentQuestion++;
            if (this.currentQuestion < this.perguntas.length) {
                this.mostrarPergunta();
            } else {
                this.finalizarTriagem();
            }
        }, 800); // Aumentei o delay para dar mais tempo de ver a resposta
    },

    calcularPrioridade: function() {
        let pontuacao = 0;
        let sintomas = [];

        // Começar do índice 2 para pular as perguntas de confirmação
        for (let i = 2; i < this.perguntas.length; i++) {
            const pergunta = this.perguntas[i];
            const resposta = this.respostas[i];

            if (!resposta) continue;

            if (pergunta.tipo === 'opcoes') {
                pontuacao += pergunta.peso[resposta] || 0;
                if (pergunta.peso[resposta] > 0) {
                    sintomas.push(`${pergunta.texto}: ${resposta}`);
                }
            } else if (pergunta.tipo === 'multiplo' && Array.isArray(resposta)) {
                resposta.forEach(opcao => {
                    pontuacao += pergunta.peso[opcao] || 0;
                    if (pergunta.peso[opcao] > 0) {
                        sintomas.push(`${pergunta.texto}: ${opcao}`);
                    }
                });
            } else if (pergunta.tipo === 'simNao' && resposta === 'sim') {
                pontuacao += pergunta.peso;
                sintomas.push(pergunta.texto);
            }
        }

        // Ajustar classificação baseada na pontuação total
        let resultado;
        if (pontuacao >= 12) {
            resultado = { 
                nivel: 'vermelho', 
                texto: 'Emergência', 
                tempo: 'Atendimento Imediato',
                icon: 'fa-exclamation-triangle'
            };
        } else if (pontuacao >= 8) {
            resultado = { 
                nivel: 'laranja', 
                texto: 'Muito Urgente', 
                tempo: 'Até 10 minutos',
                icon: 'fa-exclamation-circle'
            };
        } else if (pontuacao >= 5) {
            resultado = { 
                nivel: 'amarelo', 
                texto: 'Urgente', 
                tempo: 'Até 60 minutos',
                icon: 'fa-exclamation'
            };
        } else if (pontuacao >= 3) {
            resultado = { 
                nivel: 'verde', 
                texto: 'Pouco Urgente', 
                tempo: 'Até 120 minutos',
                icon: 'fa-check-circle'
            };
        } else {
            resultado = { 
                nivel: 'azul', 
                texto: 'Não Urgente', 
                tempo: 'Até 240 minutos',
                icon: 'fa-info-circle'
            };
        }

        resultado.sintomas = sintomas;
        return resultado;
    },

    finalizarTriagem: function() {
        const resultado = this.calcularPrioridade();
        const nome = this.respostas[0];
        const user = DB.get('currentUser');

        const mensagemFinal = `
            ${user.nome}, com base nas suas respostas, sua classificação é:
            Nível: ${resultado.texto}
            Tempo estimado de espera: ${resultado.tempo}
            
            Por favor, aguarde ser chamado(a).
            Em caso de piora, avise a equipe de enfermagem.
        `;

        this.adicionarMensagemBot(mensagemFinal);

        // Salvar resultado
        const dadosTriagem = {
            nome: user.nome,
            cpf: user.cpf || 'Não informado',
            idade: user.idade || 'Não informada',
            dataTriagem: new Date().toISOString(),
            respostas: this.respostas,
            resultado: resultado,
            sintomas: resultado.sintomas
        };

        DB.save('ultimaTriagem', dadosTriagem);

        // Redirecionar após 3 segundos
        setTimeout(() => {
            window.location.href = 'resultado.html';
        }, 3000);
    }
};

// Inicializar chatbot quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('triagem.html')) {
        ChatBot.init();
    }
});

// Funções de Validação
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Validação do CPF
    let soma = 0;
    let resto;
    
    if (cpf === '00000000000') return false;
    
    for (let i = 1; i <= 9; i++) {
        soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Funções de UI
function showResetPassword() {
    Toast.show('Função de recuperação de senha em desenvolvimento', 'info');
}

function showTerms() {
    // Implementar modal com os termos de uso
    Toast.show('Termos de uso em desenvolvimento', 'info');
}

// Verificar se usuário está logado
function checkLogin() {
    const currentUser = DB.get('currentUser');
    const userType = DB.get('userType');
    
    if (!currentUser || !userType) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// Login Admin
function handleAdminLogin() {
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPassword').value;

    console.log('Tentando login admin:', { username, password });

    if (!username || !password) {
        Toast.show('Preencha todos os campos', 'warning');
        return;
    }

    // Credenciais de teste
    if (username === 'admin' && password === 'admin123') {
        const adminData = {
            nome: 'Administrador',
            tipo: 'admin',
            email: 'admin@sistema.com'
        };
        
        console.log('Login admin bem-sucedido!');
        Toast.show('Login admin realizado com sucesso!', 'success');
        DB.save('currentUser', adminData);
        DB.save('userType', 'admin');
        
        // Redirecionar para a página inicial como admin
        setTimeout(() => {
            window.location.href = 'triagem.html';
        }, 1000);
    } else {
        Toast.show('Credenciais inválidas', 'error');
    }
}

// Cadastro de usuário
function handleCadastro() {
    const nome = document.getElementById('cadastroNome').value;
    const email = document.getElementById('cadastroEmail').value;
    const senha = document.getElementById('cadastroSenha').value;
    const confirmSenha = document.getElementById('confirmSenha').value;
    const termos = document.getElementById('termos').checked;

    console.log('Tentando cadastro:', { nome, email, senha, confirmSenha, termos });

    if (!nome || !email || !senha || !confirmSenha) {
        Toast.show('Preencha todos os campos', 'warning');
        return;
    }

    if (senha !== confirmSenha) {
        Toast.show('As senhas não coincidem', 'error');
        return;
    }

    if (!termos) {
        Toast.show('Você precisa aceitar os termos de uso', 'error');
        return;
    }

    // Salvar dados do usuário
    const userData = {
        nome: nome,
        email: email,
        senha: senha,
        tipo: 'usuario',
        dataCadastro: new Date().toISOString()
    };

    console.log('Salvando usuário:', userData);

    // Salvar no localStorage
    DB.save('userData', userData);
    DB.save('currentUser', userData);
    DB.save('userType', 'usuario');

    Toast.show('Cadastro realizado com sucesso!', 'success');
    
    // Redirecionar para a página inicial
    setTimeout(() => {
        window.location.href = 'triagem.html';
    }, 1000);
}

// Login normal
function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        Toast.show('Preencha todos os campos', 'warning');
        return;
    }

    // Verificar dados salvos
    const userData = DB.get('userData');
    
    console.log('Tentando login com:', { username, password });
    console.log('Dados salvos:', userData);
    
    if (userData) {
        const user = userData;
        console.log('Usuário encontrado:', user);
        
        if ((username === user.email || username === user.cpf) && password === user.senha) {
            console.log('Login bem-sucedido!');
            Toast.show('Login realizado com sucesso!', 'success');
            DB.save('currentUser', user);
            DB.save('userType', 'usuario');
            
            setTimeout(() => {
                window.location.href = 'triagem.html';
            }, 1000);
            return;
        }
    }

    Toast.show('Usuário ou senha incorretos', 'error');
}

// Função para limpar dados do login
function clearLoginData() {
    DB.remove('currentUser');
    DB.remove('userType');
    DB.remove('userData');
}

// Verificar se usuário está logado
function checkLogin() {
    const currentUser = DB.get('currentUser');
    const userType = DB.get('userType');
    
    console.log('Verificando login:', { currentUser, userType });
    
    if (!currentUser || !userType) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// Função para converter tempo em minutos para milissegundos
function getWaitingTimeInMs(tempo) {
    const tempos = {
        'Atendimento Imediato': 0,
        'Até 10 minutos': 10 * 60 * 1000,
        'Até 60 minutos': 60 * 60 * 1000,
        'Até 120 minutos': 120 * 60 * 1000,
        'Até 240 minutos': 240 * 60 * 1000
    };
    return tempos[tempo] || 0;
}

// Função para formatar o tempo restante
function formatTimeRemaining(ms) {
    if (ms < 0) return '00:00:00';
    
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Função para iniciar o contador regressivo
function startCountdown(endTime) {
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
            countdownElement.textContent = '00:00:00';
            countdownElement.classList.add('ending');
            return;
        }

        countdownElement.textContent = formatTimeRemaining(timeLeft);

        // Adiciona classe especial quando faltam 5 minutos
        if (timeLeft <= 5 * 60 * 1000) {
            countdownElement.classList.add('ending');
        }
    }

    // Atualiza a cada segundo
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // Limpa o intervalo quando a página é fechada
    window.addEventListener('beforeunload', () => clearInterval(interval));
}

// Inicialização da página de resultado
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de resultado
    if (!window.location.pathname.endsWith('resultado.html')) return;

    const triagem = DB.get('ultimaTriagem');
    if (!triagem) {
        window.location.href = 'triagem.html';
        return;
    }

    try {
        // Atualiza informações do paciente
        document.getElementById('nomePaciente').textContent = triagem.nome || 'Nome não informado';
        document.getElementById('dataTriagem').textContent = new Date(triagem.dataTriagem).toLocaleString();
        document.getElementById('idadePaciente').textContent = `${triagem.idade || 'N/A'} anos`;

        // Atualiza status e prioridade
        const statusSection = document.getElementById('statusBox');
        statusSection.className = `status-section ${triagem.resultado.nivel}`;
        
        const statusIcon = document.getElementById('statusIcon');
        statusIcon.className = `fas ${triagem.resultado.icon}`;
        
        document.getElementById('statusText').textContent = triagem.resultado.texto;
        document.getElementById('tempoEspera').textContent = triagem.resultado.tempo;

        // Iniciar contador regressivo
        const waitTime = getWaitingTimeInMs(triagem.resultado.tempo);
        const endTime = new Date(triagem.dataTriagem).getTime() + waitTime;
        startCountdown(endTime);

        // Atualiza lista de sintomas
        const sintomasLista = document.getElementById('sintomasLista');
        if (triagem.sintomas && triagem.sintomas.length > 0) {
            sintomasLista.innerHTML = triagem.sintomas
                .map(sintoma => `<div class="symptom-tag">${sintoma}</div>`)
                .join('');
        } else {
            sintomasLista.innerHTML = '<div class="symptom-tag">Nenhum sintoma relatado</div>';
        }

    } catch (error) {
        console.error('Erro ao carregar dados da triagem:', error);
        Toast.show('Erro ao carregar os dados. Tente novamente.', 'error');
    }
});

// Função para converter tempo de espera em milissegundos
function getWaitingTimeInMs(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
}

// Função para atualizar o contador regressivo
function startCountdown(endTime) {
    const countdownElement = document.getElementById('countdown');
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance <= 0) {
            countdownElement.textContent = '00:00';
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        countdownElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        setTimeout(updateCountdown, 1000);
    }

    updateCountdown();
}

// Função para alternar entre as abas
function switchTab(tab) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    
    // Esconder todos os formulários
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('cadastroForm').style.display = 'none';
    document.getElementById('adminForm').style.display = 'none';
    
    // Adicionar classe active na aba selecionada
    const selectedTab = document.querySelector(`.auth-tab[onclick="switchTab('${tab}')"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Mostrar o formulário correspondente
    const form = document.getElementById(`${tab}Form`);
    if (form) {
        form.style.display = 'block';
    }
}