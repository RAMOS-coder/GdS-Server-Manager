const { EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const ping = require("ping");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { GREEN, RED, RESET } = process.env;
const { SERVER_HOST_DDNS, SERVER_HOST, DDNS_PORT } = process.env;
const LOG_FILE = path.join(process.env.PATH_LOG, "connectionWireguard_log.txt");
const CHANNEL_ID = process.env.CHANNEL_ID_SERVER;
const wireguard = process.env.PROGRAM_WIREGUARD;
const tunnel = process.env.TUNNEL_WIREGUARD;

const logMessage = (message, level = 'INFO') => {
    const now = new Date().toLocaleString('pt-BR', { timeZoneName: 'short' });
    const log_message = `[${level} ${now}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, log_message);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isInterfaceConnected = async () => {
    return new Promise((resolve, reject) => {
        exec("netsh interface ipv4 show interfaces", (error, stdout, stderr) => {
            if (error) {
                console.error(`[ERRO NETSH]: ${stderr || error.message}`);
                return reject(error);
            }

            // Verifica se a interface está conectada
            const interfaceIsConnected = stdout.includes("connected") && stdout.includes("wg-gds_server_IP-PUBLIC-2");
            resolve(interfaceIsConnected);
        });
    });
};

// Função para verificar conexão usando psping
let lastConnectionMethod = null; // Variável para rastrear o último método usado

/* Antes da melhoria do dia 25/03/2025 13:54 
const checkConnection = async () => {
    try {
        const interfaceConnected = await isInterfaceConnected();

        if (interfaceConnected) {
            // Verifica via ping se a interface está conectada
            if (lastConnectionMethod !== "ping") {
                console.log("Interface WireGuard está conectada. Usando ping...");
                lastConnectionMethod = "ping";
            }

            const pingResult = await ping.promise.probe(SERVER_HOST);
            return pingResult.alive;
        } else {
            // Verifica via psping se a interface não está conectada
            if (lastConnectionMethod !== "psping") {
                console.log("Interface WireGuard não está conectada. Usando psping...");
                lastConnectionMethod = "psping";
            }

            return new Promise((resolve) => {
                exec(`psping -n 1 ${SERVER_HOST_DDNS}:${DDNS_PORT}`, (error, stdout, stderr) => {
                    if (error || stderr.includes("expirou")) {
                        console.error(`[ERRO PSPING]: ${stderr || error.message}`);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }
    } catch (error) {
        console.error(`[ERRO CHECK CONNECTION]: ${error.message}`);
        return false;
    }
};*/

//Melhoria realizada no dia 25/03/2025 13:54 para reduzir significativamente os falsos positivos
const checkConnection = async (attempts = 3, delayMs = 2000) => {
    try {
        const interfaceConnected = await isInterfaceConnected();
        let successCount = 0;

        const startMsg = `Iniciando verificação de conexão: ${attempts} tentativas com intervalo de ${delayMs}ms.`;
        console.log(startMsg);
        logMessage(startMsg);

        for (let i = 0; i < attempts; i++) {
            const attemptMsg = `Tentativa ${i + 1} de ${attempts}...`;
            console.log(attemptMsg);
            logMessage(attemptMsg);

            if (interfaceConnected) {
                // Verifica via ping se a interface está conectada
                if (lastConnectionMethod !== "ping") {
                    const methodMsg = "Interface WireGuard está conectada. Usando ping...";
                    console.log(methodMsg);
                    logMessage(methodMsg);
                    lastConnectionMethod = "ping";
                }

                const pingResult = await ping.promise.probe(SERVER_HOST);
                if (pingResult.alive) {
                    const pingSuccessMsg = "Ping bem-sucedido.";
                    console.log(pingSuccessMsg);
                    logMessage(pingSuccessMsg);
                    successCount++;
                } else {
                    const pingFailMsg = "Ping falhou.";
                    console.warn(pingFailMsg);
                    logMessage(pingFailMsg);
                }
            } else {
                // Verifica via psping se a interface não está conectada
                if (lastConnectionMethod !== "psping") {
                    const methodMsg = "Interface WireGuard não está conectada. Usando psping...";
                    console.log(methodMsg);
                    logMessage(methodMsg);
                    lastConnectionMethod = "psping";
                }

                const isAlive = await new Promise((resolve) => {
                    exec(`psping -n 1 ${SERVER_HOST_DDNS}:${DDNS_PORT}`, (error, stdout, stderr) => {
                        if (error || stderr.includes("expirou")) {
                            const pspingFailMsg = `[PSPING Falhou]: ${stderr || error.message}`;
                            console.warn(pspingFailMsg);
                            logMessage(pspingFailMsg);
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    });
                });

                if (isAlive) {
                    const pspingSuccessMsg = "Psping bem-sucedido.";
                    console.log(pspingSuccessMsg);
                    logMessage(pspingSuccessMsg);
                    successCount++;
                } else {
                    const pspingFailMsg = "Psping falhou.";
                    console.warn(pspingFailMsg);
                    logMessage(pspingFailMsg);
                }
            }

            // Se já houver mais de 50% de sucesso, considera a conexão OK
            if (successCount > Math.floor(attempts / 2)) {
                const connectionSuccessMsg = "Conexão validada com sucesso antes de atingir o limite de tentativas.";
                console.log(connectionSuccessMsg);
                logMessage(connectionSuccessMsg);
                return true;
            }

            // Espera um pouco antes da próxima tentativa, se não for a última
            if (i < attempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        const connectionFailMsg = "Conexão não validada após todas as tentativas.";
        console.warn(connectionFailMsg);
        logMessage(connectionFailMsg);
        return false;
    } catch (error) {
        const errorMsg = `[ERRO CHECK CONNECTION]: ${error.message}`;
        console.error(errorMsg);
        logMessage(errorMsg);
        return false;
    }
};

// Função para iniciar o serviço WireGuard
const startService = async (callback) => {
    exec(`${wireguard} /installtunnelservice ${tunnel}`, async (error, stderr) => {
        if (error) {
            logMessage(`Erro ao iniciar o serviço: \n${stderr}\n${error}`);
            callback(error);
            return;
        }
        logMessage(`Serviço WireGuard iniciado com sucesso.`);
        await delay(10000); // Espera 10 segundos
        callback(null);
    });
};

// Função para parar o serviço WireGuard
const stopService = async (callback) => {
    exec(`${wireguard} /uninstalltunnelservice ${tunnel.split("\\").pop().slice(0, -6)}`, async (error, stderr) => {
        if (typeof callback !== 'function') {
            console.error('Erro: Callback não é uma função. Valor recebido:', callback);
            return; // Interrompe a execução se `callback` for inválido
        }

        if (stderr.includes('does not exist')) {
            logMessage('O serviço não está em execução.');
            callback(null);
            return;
        }

        if (error) {
            logMessage(`Erro ao parar o serviço: \n${stderr}\n${error}`);
            callback(error);
            return;
        }

        logMessage(`Serviço WireGuard parado com sucesso.`);
        await delay(10000); // Espera 10 segundos
        callback(null);
    });
};

// Função para reiniciar o serviço Radmin
const restartRadminService = async () => {
    logMessage("Reiniciando o serviço Radmin (RvControlSvc)...");
    exec("net stop RvControlSvc && net start RvControlSvc", (error, stdout, stderr) => {
        if (error) {
            logMessage(`Erro ao reiniciar o serviço Radmin: ${stderr}`);
            return;
        }
        logMessage("Serviço Radmin reiniciado com sucesso.");
    });
};

const restartCloudflaredService = async (client) => {
    logMessage("Verificando o status do serviço Cloudflared...");

    exec('sc query Cloudflared', (error, stdout, stderr) => {
        if (error) {
            logMessage(`Erro ao verificar o serviço Cloudflared: ${stderr}`);
            return;
        }

        // Verifica se o serviço está rodando ou parado
        const isRunning = stdout.includes("STATE") && stdout.includes("RUNNING");

        if (isRunning) {
            logMessage("Serviço Cloudflared está ativo, reiniciando...");
            exec("net stop Cloudflared && net start Cloudflared", (error, stdout, stderr) => {
                if (error) {
                    logMessage(`Erro ao reiniciar o serviço Cloudflared: ${stderr}`);
                    return;
                }
                logMessage("Serviço Cloudflared reiniciado com sucesso.");
                sendDiscordMessage(client, "Cloudflare Service", "Serviço do Cloudflare foi reiniciado com sucesso!");
            });
        } else {
            logMessage("Serviço Cloudflared não está em execução, iniciando...");
            exec("net start Cloudflared", (error, stdout, stderr) => {
                if (error) {
                    logMessage(`Erro ao iniciar o serviço Cloudflared: ${stderr}`);
                    return;
                }
                logMessage("Serviço Cloudflared iniciado com sucesso.");
                sendDiscordMessage(client, "Cloudflare Service", "Serviço do Cloudflare foi iniciado com sucesso!");
            });
        }
    });
};

// Função auxiliar para enviar mensagem no Discord
const sendDiscordMessage = (client, tunnel, status) => {
    if (client?.channels?.cache?.get(CHANNEL_ID)) {
        const embed = new EmbedBuilder()
            .setColor('#F48120')
            .setTitle('GdS Server - Monitoramento de Tunnel')
            .addFields(
                { name: 'Tunnel', value: tunnel, inline: true },
                { name: 'Status', value: status, inline: false }
            )
            .setThumbnail(process.env.CLOUDFLARED_THUMBNAIL);

        client.channels.cache.get(CHANNEL_ID).send({ embeds: [embed] });
    } else {
        logMessage('Bot não está conectado ao Discord ou canal indisponível.');
    }
};



// Função para reiniciar o serviço WireGuard
const restartService = async (client) => {
    logMessage(`Reiniciando o serviço WireGuard...`);

    stopService((stopError) => {
        if (stopError) return;

        startService(async (startError) => {
            if (startError) return;

            // Verificar a conexão após reiniciar o serviço
            await delay(10000); // Espera 10 segundos para a conexão ser estabelecida
            if (await checkConnection()) {
                await restartRadminService();
                await delay(10000); // Espera 10 segundos para a conexão ser estabelecida
                await restartCloudflaredService(client);
                await delay(10000); // Espera 10 segundos para a conexão ser estabelecida
                logMessage(`Conexão com ${SERVER_HOST_DDNS} restabelecida com sucesso após reiniciar o serviço.`);

                if (client?.channels?.cache?.get(CHANNEL_ID)) {
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('GdS Server - Monitoramento de Tunnel')
                        .addFields(
                            { name: 'Tunnel', value: 'WireGuard Service', inline: true },
                            { name: 'Status', value: 'Serviço do WireGuard foi reiniciado com sucesso!', inline: false }
                        )
                        .setThumbnail(process.env.WIREGUARD_THUMBNAIL); // Adicione a URL da thumbnail do WireGuard no .env

                    client.channels.cache.get(CHANNEL_ID).send({ embeds: [embed] });
                } else {
                    logMessage('Bot não está conectado ao Discord ou canal indisponível.');
                }
            } else {
                logMessage(`Falha ao restabelecer a conexão com ${SERVER_HOST_DDNS} após reiniciar o serviço.`);
            }
        });
    });
};

// Função para monitorar a conexão e tentar reconectar até 3 vezes antes de parar o túnel
/*const monitorConnection = async (client) => {
    let cooldown = false;
    let count = 0;

    while (true) {
        try {
            const interfaceConnected = await isInterfaceConnected();
            const connectionActive = await checkConnection();

            if (connectionActive && interfaceConnected) {
                logMessage(`Conexão com ${SERVER_HOST_DDNS} está ativa e o túnel está habilitado.`);
                count = 0; // Reseta o contador de tentativas
                cooldown = false; // Reseta o cooldown
                await delay(60000); // Espera 5 minutos 300000
            } else if (connectionActive && !interfaceConnected) {
                logMessage(`Conexão detectada via psping, mas o túnel não está ativo. Tentando reativar...`);
                await startService(async (startError) => {
                    if (startError) {
                        logMessage(`Erro ao reativar o túnel: ${startError.message}`);
                    } else {
                        logMessage(`Túnel WireGuard reativado com sucesso.`);
                    }
                });
                await delay(20000); // Aguarda 20 segundos para estabilizar
            } else {
                logMessage(`Conexão com ${SERVER_HOST_DDNS} falhou.`);

                if (!cooldown) {
                    count++;
                    logMessage(`Tentativa ${count} de 3...`);

                    await restartService(client);
                    await delay(40000); // 40 segundos de espera após reiniciar o serviço

                    if (count >= 3) {
                        logMessage(`Falha ao reconectar após ${count} tentativas. Desabilitando o túnel...`);
                        count = 0; // Reseta o contador de tentativas

                        await stopService((stopError) => {
                            if (!stopError) {
                                restartRadminService();
                            }
                        });

                        // Aguardar um tempo adicional após reiniciar o serviço Radmin
                        await delay(20000); // 20 segundos de espera para o serviço estabilizar

                        logMessage(`Monitorando reconexão a cada 5 minutos...`);
                        cooldown = true; // Ativa o cooldown para evitar reinícios repetidos
                    } else {
                        // Aguarda antes de tentar novamente para não sobrecarregar o sistema
                        await delay(30000); // 30 segundos de espera antes da próxima tentativa
                    }
                } else {
                    logMessage(`Serviço já foi reiniciado recentemente. Aguardando reconexão.`);
                    await delay(300000); // Espera 5 minutos
                }
            }
        } catch (err) {
            logMessage(`Erro inesperado durante a monitorização: ${err.message}`);
            await delay(60000); // Aguarda 1 minuto antes de continuar em caso de erro
        }
    }
};*/

const monitorConnection = async (client) => {
    let cooldown = false;
    let count = 0;

    while (true) {
        try {
            const interfaceConnected = await isInterfaceConnected();
            const connectionActive = await checkConnection();

            if (connectionActive && interfaceConnected) {
                logMessage(`Conexão com ${SERVER_HOST_DDNS} está ativa e o túnel está habilitado.`);
                count = 0; // Reseta o contador de tentativas
                cooldown = false; // Reseta o cooldown
                await delay(300000); // Espera 5 minutos 300000
            } else if (connectionActive && !interfaceConnected) {
                logMessage(`Conexão detectada via psping, mas o túnel não está ativo. Tentando reativar...`);
                await startService(async (startError) => {
                    if (startError) {
                        logMessage(`Erro ao reativar o túnel: ${startError.message}`);
                    } else {
                        logMessage(`Túnel WireGuard reativado com sucesso.`);
                    }
                });
                await delay(20000); // Aguarda 20 segundos para estabilizar
            } else {
                logMessage(`Conexão com ${SERVER_HOST_DDNS} falhou.`);

                if (!cooldown) {
                    count++;
                    logMessage(`Tentativa ${count} de 3...`);

                    if (count < 3) {
                        // Reinicia o serviço WireGuard nas primeiras 3 tentativas
                        await restartService(client);
                        await delay(40000); // 40 segundos de espera após reiniciar o serviço
                    } else {
                        // Se atingiu 3 tentativas, utiliza o psping para verificar a conexão
                        logMessage(`Tentativas falhas atingiram o limite. Verificando via psping...`);
                        const pspingResult = await checkConnection(); // Verifica via psping

                        if (pspingResult) {
                            logMessage(`Conexão com ${SERVER_HOST_DDNS} estabelecida via psping, mas o túnel não está ativo. Tentando reativar...`);
                            await startService(async (startError) => {
                                if (startError) {
                                    logMessage(`Erro ao reativar o túnel: ${startError.message}`);
                                } else {
                                    logMessage(`Túnel WireGuard reativado com sucesso.`);
                                }
                            });
                            await delay(20000); // Aguarda 20 segundos para estabilizar
                        } else {
                            logMessage(`Conexão via psping falhou após 3 tentativas. Desabilitando o túnel...`);
                            count = 0; // Reseta o contador de tentativas

                            // Para o túnel e usa a rede local
                            await stopService((stopError) => {
                                if (!stopError) {
                                    logMessage("Túnel WireGuard desabilitado. Usando a rede local.");
                                    restartRadminService(); // Reinicia o serviço Radmin mesmo sem o túnel
                                } else {
                                    logMessage(`Erro ao parar o serviço WireGuard: ${stopError.message}`);
                                }
                            });

                            // Aguardar um tempo adicional após parar o serviço
                            await delay(20000); // 20 segundos de espera para o serviço estabilizar

                            logMessage(`Monitorando reconexão a cada 5 minutos...`);
                            cooldown = true; // Ativa o cooldown para evitar reinícios repetidos
                        }
                    }
                } else {
                    logMessage(`Serviço já foi reiniciado recentemente. Aguardando reconexão.`);
                    await delay(300000); // Espera 5 minutos
                }
            }
        } catch (err) {
            logMessage(`Erro inesperado durante a monitorização: ${err.message}`);
            await delay(60000); // Aguarda 1 minuto antes de continuar em caso de erro
        }
    }
};

const ensureServiceRunning = (callback) => {
    if (!isInterfaceConnected()) {
        logMessage('O serviço WireGuard não está em execução. Iniciando o serviço...');
        startService(callback);
    } else {
        logMessage('O serviço WireGuard já está em execução.');
        callback(null);
    }
};

module.exports = {
    name: 'monitTunnelWireguard',
    execute(client) {
        logMessage(`Verificação de conexão com ${SERVER_HOST_DDNS} (WireGuard) iniciada...`);
        console.log(`${JSON.parse(GREEN)}Verificação de conexão com ${SERVER_HOST_DDNS} (WireGuard) iniciada...${JSON.parse(RESET)}\n`);
        ensureServiceRunning((error) => {
            if (!error) {
                monitorConnection(client);
            }
        });
    },
};
