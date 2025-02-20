document.addEventListener('DOMContentLoaded', () => {
    // Gráfico de distribuição por prioridade
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    new Chart(priorityCtx, {
        type: 'doughnut',
        data: {
            labels: ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'],
            datasets: [{
                data: [10, 20, 30, 25, 15],
                backgroundColor: [
                    '#d32f2f',
                    '#f57c00',
                    '#fdd835',
                    '#43a047',
                    '#1e88e5'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Gráfico de tempo médio de espera
    const waitingCtx = document.getElementById('waitingTimeChart').getContext('2d');
    new Chart(waitingCtx, {
        type: 'bar',
        data: {
            labels: ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'],
            datasets: [{
                label: 'Tempo Médio (minutos)',
                data: [5, 15, 45, 90, 180],
                backgroundColor: [
                    '#d32f2f',
                    '#f57c00',
                    '#fdd835',
                    '#43a047',
                    '#1e88e5'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico de atendimentos por dia
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
            datasets: [{
                label: 'Atendimentos',
                data: [65, 59, 80, 81, 56, 40, 30],
                fill: false,
                borderColor: '#1565c0',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
});