const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

require('dotenv').config();

function checkTaskList(pid) {
    return new Promise((resolve, reject) => {
        exec(`tasklist /fi "pid eq ${pid}"`, { encoding: 'utf8' }, (err, stdout) => {
            if (err) {
                reject(`Erro ao verificar o tasklist: ${err}`);
            } else if (stdout.includes('nenhuma tarefa') || stdout.includes('No tasks')) {
                reject('offline');
            } else {
                resolve();
            }
        });
    });
}

function runPsping(host, port) {
    return new Promise((resolve, reject) => {
        const psping = spawn('psping', ['-u', '-l', '2048', `${host}:${port}`]);
        let output = Buffer.from([]);

        psping.stdout.on('data', (data) => {
            output = Buffer.concat([output, data]);
        });

        psping.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        psping.on('close', (code) => {
            if (code !== 0) {
                reject(`psping exited with code ${code}`);
            } else {
                // Convert the output from the original encoding (assuming it is Windows-1252) to UTF-8
                const utf8Output = iconv.decode(output, 'win1252');
                resolve(utf8Output);
            }
        });
    });
}

function getServerInfo(id) {
    return servers.find(server => server.id === id);
}

async function serverStatus(choice) {
    const serverInfo = getServerInfo(choice);
    if (!serverInfo) {
        throw { status: 'offline' };
    }

    const { name, port, playitPort } = serverInfo;

    try {
        await checkTaskList(pid);

        let output;
        if (name === 'V Rising') {
            output = await runPsping(process.env.PLAYIT_SHARED, playitPort);
            console.log('19.ip.gl.ply.gg\n', output);
            if (output.includes('estabelecida')) {
                return { status: 'online', ip: process.env.PLAYIT_SHARED, port: playitPort };
            } else {
                throw { status: 'offline' };
            }
        } else {
            output = await runPsping(process.env.SERVER_HOST, port);
            console.log('gdsserver.ddns.net\n', output);
            if (output.includes('estabelecida')) {
                return { status: 'online', ip: process.env.SERVER_HOST, port: port };
            } else if (output.includes('expirou')) {
                output = await runPsping(process.env.PLAYIT_SHARED, playitPort);
                console.log('19.ip.gl.ply.gg\n', output);
                if (output.includes('estabelecida')) {
                    return { status: 'online', ip: process.env.PLAYIT_SHARED, port: playitPort };
                } else {
                    throw { status: 'offline' };
                }
            } else {
                throw { status: 'offline', message: 'Não consegui identificar o status do servidor.' };
            }
        }
    } catch (error) {
        if (error.status === 'offline') {
            throw { status: 'offline' };
        } else {
            console.error(error);
            throw { status: 'offline', message: 'Erro ao verificar o status do servidor.' };
        }
    }
}

const servers = [
    {
        id: 'java',
        name: 'Minecraft Java',
        icon: process.env.MINECRAFT_JAVA,
        port: process.env.MINECRAFT_PORT,
        playitPort: process.env.MINECRAFT_PLAYIT_PORT
    },
    {
        id: 'VRisingServer',
        name: 'V Rising',
        icon: process.env.V_RISING,
        port: process.env.V_RISING_PORT,
        playitPort: process.env.V_RISING_PLAYIT_PORT
    },
    {
        id: 'valheim_server',
        name: 'Valheim',
        icon: process.env.VALHEIM,
        port: process.env.VALHEIM_PORT,
        playitPort: process.env.VALHEIM_PLAYIT_PORT
    },
    {
        id: 'RustDedicated',
        name: 'Rust',
        icon: process.env.RUST,
        port: process.env.RUST_PORT,
        playitPort: process.env.RUST_PLAYIT_PORT
    },
    {
        id: 'PalServer-Win64-Shipping-Cmd',
        name: 'Palword',
        icon: process.env.PALWORD,
        port: process.env.PALWORD_PORT,
        playitPort: process.env.PALWORD_PLAYIT_PORT
    }
];

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('server-status')
        .setDescription('Verifica o status "Online" ou "Offline" de um servidor de escolha!')
        .addStringOption(option =>
            option.setName('selecionar-servidor')
                .setDescription('Selecione o jogo para verificar o status.')
                .setRequired(true)
            .addChoices(
                { name: 'Minecraft Java', value: 'java' },
                { name: 'V Rising', value: 'VRisingServer' },
                { name: 'Valheim', value: 'valheim_server' },
                { name: 'Rust', value: 'RustDedicated' },
                { name: 'Palword', value: 'PalServer-Win64-Shipping-Cmd' },
            )),
    async execute(interaction) {
        const choice = interaction.options.getString('selecionar-servidor');
        await interaction.deferReply({ ephemeral: false });

        try {
            const { status, message } = await serverStatus(choice);
            const embed = new EmbedBuilder()
                .setTitle(`[GdS] Server - ${serverName[choice]}`)
                .addFields(
                    { name: 'Status', value: status === 'online' ? '🟢 Started | Auto Start' : '🔴 Stopped', inline: true },
                    { name: 'Game Server', value: `${serverName[choice]} Dedicated Server`, inline: false },
                    { name: 'Server IP:Port', value: '192.168.1.83:8004', inline: false }
                )
                .setColor(status === 'online' ? 0x00FF00 : 0xFF0000) // VERDE para online, VERMELHO para offline
                .setThumbnail(serverIcons[choice])
                .setFooter({ text: 'v1.23.1 - Discord Alert | Hoje às 15:30', iconURL: 'https://example.com/your-icon.png' });

            await interaction.editReply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            const { message } = error;
            const embed = new EmbedBuilder()
                .setTitle(`Status do Servidor`)
                .setDescription(message)
                .setColor(0xFF0000) // VERMELHO para erros
                .setThumbnail(serverIcons[choice]);

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        }
    },
};
