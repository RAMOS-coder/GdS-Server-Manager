const { time } = require('console');
const Discord = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { env } = require('process');

dotenv.config();

const { YELLOW, RESET } = process.env;

const bot = new Discord.Client({
    intents: [
        'Guilds', 
        'GuildMessages',
        'GuildMembers',
        'MessageContent',
        'GuildVoiceStates',
    ],
    makeCache: Discord.Options.cacheWithLimits({ // Cache otimizado, opcional
        MessageManager: 200, // Ajuste conforme necessidade
    }),
    presence: {
        activities: [{ name: 'Monitorando conexão', type: Discord.ActivityType.Watching }],
        status: 'online',
    },
    // Configuração adicional para reconexão
    retryLimit: 3, // Número de tentativas de reconexão
});

bot.on('shardDisconnect', (event, shardId) => {
    console.log(`[Shard ${shardId}] Desconectado. Código de fechamento: ${event.code}`);
});

bot.on('shardError', (error, shardId) => {
    console.error(`[Shard ${shardId}] Erro detectado: ${error.message}`);
});

bot.on('shardReconnecting', (shardId) => {
    console.log(`[Shard ${shardId}] Tentando reconectar...`);
});

bot.commands = new Discord.Collection();
bot.cooldowns = new Discord.Collection();
bot.queues = new Map();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Defina um novo item na Coleção com a chave como nome do comando e o valor como módulo exportado
		if ('data' in command && 'execute' in command) {
			bot.commands.set(command.data.name, command);
		} else {
			console.log(`${JSON.parse(YELLOW)}[AVISO] O comando em ${filePath} não possui uma propriedade "data" ou "execute" obrigatória.${JSON.parse(RESET)}`);
		}
	}
}

// Carregar e iniciar os scripts de eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		bot.once(event.name, (...args) => event.execute(...args));
	} else {
		bot.on(event.name, (...args) => event.execute(...args));
	}
}

// Carregar e iniciar os scripts de monitoramento dos túneis
const monitorsPath = path.join(__dirname, 'monitor');
const monitorFiles = fs.readdirSync(monitorsPath).filter(file => file.endsWith('.js'));

for (const file of monitorFiles) {
    const filePath = path.join(monitorsPath, file);
    const monitor = require(filePath);

	// Verificando se o arquivo monitor tem a propriedade execute
    if (monitor.execute) {
        try {
            // Executando a função execute do monitor
            monitor.execute(bot);
        } catch (error) {
            console.error(`[MONITORAMENTO] Erro no monitor ${file}: ${error.message}`);
        }
    } else {
        console.log(`${JSON.parse(YELLOW)}[AVISO] O script em ${file} não possui uma propriedade "execute" obrigatória.${JSON.parse(RESET)}`);
    }
}

/*setTimeout(() => {
	bot.login(process.env.TOKEN);
}, 10000); // Atraso de 10 segundos*/

let reconnectDelay = 10000; // Começa com 10 segundos
const maxReconnectDelay = 60000; // Limite de 1 minuto

const tryLogin = async () => {
    try {
        await bot.login(process.env.TOKEN);
        console.log('[BOT] Login bem-sucedido!');
        reconnectDelay = 10000; // Reseta o atraso após sucesso
    } catch (error) {
        console.error(`[BOT] Erro no login: ${error.message}`);
        console.log(`[BOT] Tentando novamente em ${reconnectDelay / 1000} segundos...`);
        setTimeout(tryLogin, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay); // Aumenta o atraso
    }
};

setTimeout(tryLogin, reconnectDelay);