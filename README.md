# GdS Server Manager

GdS Server Manager é um bot para Discord projetado para monitorar e gerenciar serviços críticos como WireGuard, Cloudflared e Radmin, garantindo conexão contínua e estabilidade no ambiente do servidor.

## Funcionalidades

- **Monitoramento de Conexão:** Verifica periodicamente a estabilidade do servidor.
- **Reinício Automático:** Identifica falhas e reinicia serviços de conexão de forma automática.
- **Notificações no Discord:** Informa o status dos serviços diretamente em um canal do Discord.
- **Registro de Logs:** Mantém um histórico detalhado de eventos e erros.

## Configuração

1. Clone o repositório:

```bash
git clone https://github.com/RAMOS-coder/GdS-Server-Manager.git
cd GdS-Server-Manager
```

2. Instale as dependências:

```bash
npm install
```
### Dependências
- **discord.js:** Biblioteca para interagir com a API do Discord.

- **ping:** Utilizado para fazer pings e verificar a conectividade de servidores.

- **dotenv:** Para carregar variáveis de ambiente do arquivo .env.

- **child_process:** Para executar comandos no sistema, como iniciar e parar serviços.

- **iconv-lite:** Para manipulação de diferentes encodings de texto.

3. Crie um arquivo `.env` com as seguintes variáveis:

```
BOT
TOKEN=
GUILD_ID = 
BOT_ID = 

WINDOWS GSM
PATH_PID= 
PATH_LOG= 

HOSTS
SERVER_HOST_DDNS= 
SERVER_HOST= 
PLAYIT_SHARED= 
PLAYIT_SHARED2= 
PLAYIT_DEDICATED= 

PORTS
SERVER_PORT= 
PALWORD_PORT= 
VALHEIM_PORT= 
RUST_PORT= 
MINECRAFT_PORT= 
V_RISING_PORT= 
------------------------------
PALWORD_PLAYIT_PORT= 
VALHEIM_PLAYIT_PORT= 
RUST_PLAYIT_PORT= 
MINECRAFT_PLAYIT_PORT= 
V_RISING_PLAYIT_PORT= 
------------------------------
DDNS_PORT=

URL SERVER ICON
MINECRAFT_JAVA= https://theme.zdassets.com/theme_assets/2155033/bc270c23058d513de5124ffea6bf9199af7a2370.png
V_RISING= https://sm.ign.com/ign_pt/cover/v/v-rising/v-rising_nfdr.jpg
VALHEIM= https://cdn2.steamgriddb.com/icon/d17892563a6984845a0e23df7841f903/32/256x256.png
PALWORD= https://pwmodding.wiki/ru/img/palworld.png
RUST= https://play-lh.googleusercontent.com/L4fcXW7pwchDqEkqg4KY2x4eziqjkCbbWy8cz1PEewZiPUZ5dy2szrt2THeTmCrgLiE

PLAYIT_THUMBNAIL= https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT277UdBJDuSSymrNEYsw9CO60jy3Ebyiaomw&s
WIREGUARD_THUMBNAIL= https://icon-icons.com/icons2/2699/PNG/512/wireguard_logo_icon_168760.png
CLOUDFLARED_THUMBNAIL= https://upload.wikimedia.org/wikipedia/commons/9/94/Cloudflare_Logo.png

ID CHANNEL DISCORD
CHANNEL_ID_SERVER= 

WIREGUARD COMMANDS
PROGRAM_WIREGUARD= '"C:\\Program Files\\WireGuard\\wireguard.exe"'
TUNNEL_WIREGUARD= '"C:\\Program Files\\WireGuard\\..."'

COLOR CONSOLE
RED='"\u001b[31m"'
YELLOW='"\u001b[1;33m"'
GREEN='"\u001b[1;32m"'
BLUE='"\u001b[34m"'
RESET='"\u001b[0m"'
```

## Execução

```batch
@echo off
:: Define o título da janela
Bot GdS - Monitoramento de Conexões

:: Navega até o diretório do projeto
cd /d C:/...

:: Inicia o bot
echo Iniciando o bot...
node src/index.js

:: Mantém a janela aberta em caso de erro
echo Bot encerrado ou erro encontrado. Pressione qualquer tecla para fechar.
pause
```

## Contribuição

- Fork o repositório e crie uma branch para sua funcionalidade.
- Submeta um Pull Request com descrição detalhada das mudanças.
