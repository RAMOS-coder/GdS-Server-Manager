# [1.0.0] - 2025-03-25

## Adições
- Primeira versão do projeto **GdS-Server-Manager**.

- Função para reiniciar o serviço WireGuard.

- Função para reiniciar o serviço Cloudflared.

- Função para reiniciar o serviço Radmin.

- Monitoramento da conexão com o servidor utilizando **ping** e *psping**.

- Notificações no Discord após reinício dos serviços com informações detalhadas.

- Estrutura de log para registrar todas as ações realizadas no arquivo **log.txt**.

## Dependências
- **discord.js:** Para interação com a API do Discord.

- **ping:** Para verificar a conectividade do servidor.

- **dotenv:** Para carregamento das variáveis de ambiente.

- **child_process:** Para execução de comandos no sistema.

- **iconv-lite:** Para manipulação de encodings de texto.