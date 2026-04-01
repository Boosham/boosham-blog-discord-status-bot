# 📊 Discord Status Bot — Cronitor

Bot de Discord que muestra un panel de estado en tiempo real consultando la API de [Cronitor](https://cronitor.io).

## ✨ Características

- Comando `!setup` para crear el panel de estado como un **Embed** con borde dorado.
- Botón interactivo **"🔄 Actualizar"** que refresca los datos sin enviar un mensaje nuevo.
- Muestra: nombre del monitor, estado (operativo/caído), latencia, región del ping, expiración SSL y emisor SSL.
- Manejo de errores con embed de error dedicado.

## 🚀 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/discord-status-bot.git
cd discord-status-bot

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
#    Copiar la plantilla y rellenar con tus credenciales
cp .env.example .env

# 4. Iniciar el bot
npm start
```

## 🔑 Variables de Entorno

| Variable           | Descripción                                         |
| ------------------ | --------------------------------------------------- |
| `DISCORD_TOKEN`    | Token del bot de Discord (Developer Portal)         |
| `CRONITOR_API_KEY` | API Key de Cronitor (Settings → API)                |

## 📁 Estructura del Proyecto

```
discord-status-bot/
├── index.js          # Lógica principal del bot
├── package.json      # Dependencias y scripts
├── .env              # Variables de entorno (NO se sube a Git)
├── .env.example      # Plantilla de variables de entorno
├── .gitignore        # Archivos excluidos de Git
└── README.md         # Este archivo
```

## 🛠️ Requisitos Previos

- **Node.js** v16.9.0 o superior
- Un **Bot de Discord** creado en el [Developer Portal](https://discord.com/developers/applications)
  - Habilitar los intents: `GUILDS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`
- Una cuenta de **Cronitor** con un monitor configurado

## 📝 Licencia

MIT
