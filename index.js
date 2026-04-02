// ─────────────────────────────────────────────────────────────
//  Discord Status-Page Bot  ·  Powered by Cronitor API
// ─────────────────────────────────────────────────────────────
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const axios = require('axios');

// ── Environment variables ────────────────────────────────────
const DISCORD_TOKEN   = process.env.DISCORD_TOKEN;
const CRONITOR_API_KEY = process.env.CRONITOR_API_KEY;

if (!DISCORD_TOKEN || !CRONITOR_API_KEY) {
  console.error('❌  Missing DISCORD_TOKEN or CRONITOR_API_KEY in .env');
  process.exit(1);
}

// ── Constants ────────────────────────────────────────────────
const CRONITOR_URL   = 'https://cronitor.io/api/monitors/8Pp07A?env=production';
const EMBED_COLOR    = 720640; // #0AFB80
const BUTTON_ID      = 'p_286642288384282625';

// ── Region labels (AWS region → human-readable) ──────────────
const REGION_LABELS = {
  'us-east-1':      '🇺🇸 US East (Virginia)',
  'us-west-1':      '🇺🇸 US West (California)',
  'eu-central-1':   '🇩🇪 EU Central (Frankfurt)',
  'ap-southeast-2': '🇦🇺 AP Southeast (Sydney)',
  'sa-east-1':      '🇧🇷 SA East (São Paulo)',
};

// ── Discord client ───────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─────────────────────────────────────────────────────────────
//  Fetch monitor data from Cronitor
// ─────────────────────────────────────────────────────────────
async function fetchCronitorStatus() {
  const response = await axios.get(CRONITOR_URL, {
    auth: {
      username: CRONITOR_API_KEY,
      password: '',              // Cronitor uses key:<empty> for Basic Auth
    },
    timeout: 10_000,
  });
  return response.data;
}

// ─────────────────────────────────────────────────────────────
//  Build the status embed from the API response
// ─────────────────────────────────────────────────────────────
function buildStatusEmbed(data) {
  const passing = data.passing ?? false;
  const statusIcon = passing ? '🟢' : '🔴';
  const statusText = passing ? 'Operativo' : 'Caído';
  
  // Usamos el status global para las regiones ya que el monitor representa el estado general
  const regionalStatus = `${statusIcon} ${statusText}`;

  const embed = new EmbedBuilder()
    .setTitle('Estado de Pagina Web - Boosham Blog')
    .setDescription(`Puedes Mirar el Status Detallado [AQUI](https://cronitor.io/monitors/8Pp07A)\n\nDisponibilidad global y estado de conectividad del portal web:`)
    .setColor(EMBED_COLOR)
    .addFields(
      {
        name: '\u200B',
        value: '\u200B',
        inline: false
      },
      {
        name: '🇦🇺 Sydney, Australia',
        value: `- ${regionalStatus}`,
        inline: false
      },
      {
        name: '🇧🇷 São Paulo, Brazil',
        value: `- ${regionalStatus}`,
        inline: false
      },
      {
        name: '🇩🇪 Frankfurt, Germany',
        value: `- ${regionalStatus}`,
        inline: false
      },
      {
        name: '🇺🇸 Virginia, USA',
        value: `- ${regionalStatus}`,
        inline: false
      }
    )
    .setFooter({ text: 'Última actualización' })
    .setTimestamp();

  return embed;
}

// ─────────────────────────────────────────────────────────────
//  Build the "Actualizar" button row
// ─────────────────────────────────────────────────────────────
function buildButtonRow() {
  const button = new ButtonBuilder()
    .setCustomId(BUTTON_ID)
    .setLabel('Actualizar')
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder().addComponents(button);
}

// ─────────────────────────────────────────────────────────────
//  Build an error embed when the API call fails
// ─────────────────────────────────────────────────────────────
function buildErrorEmbed(errorMessage) {
  return new EmbedBuilder()
    .setTitle('⚠️  Error al consultar Cronitor')
    .setColor(0xFF4444)
    .setDescription(
      `No se pudo obtener el estado del monitor.\n\`\`\`${errorMessage}\`\`\``
    )
    .setFooter({ text: 'Última actualización' })
    .setTimestamp();
}

// ─────────────────────────────────────────────────────────────
//  Event: Ready
// ─────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅  Bot conectado como ${client.user.tag}`);
});

// ─────────────────────────────────────────────────────────────
//  Event: Message  →  !setup command
// ─────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content.trim().toLowerCase() !== '!setup') return;

  try {
    const data  = await fetchCronitorStatus();
    const embed = buildStatusEmbed(data);
    const row   = buildButtonRow();

    await message.channel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('Error during !setup:', err.message);
    const embed = buildErrorEmbed(err.message);
    const row   = buildButtonRow();
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ─────────────────────────────────────────────────────────────
//  Event: Interaction  →  "Actualizar" button
// ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== BUTTON_ID) return;

  // Acknowledge immediately to prevent the 3-second timeout
  await interaction.deferUpdate();

  try {
    const data  = await fetchCronitorStatus();
    const embed = buildStatusEmbed(data);
    const row   = buildButtonRow();

    // Edit the ORIGINAL message in-place (no new message sent)
    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('Error refreshing status:', err.message);
    const embed = buildErrorEmbed(err.message);
    const row   = buildButtonRow();
    await interaction.editReply({ embeds: [embed], components: [row] });
  }
});

// ── Start ────────────────────────────────────────────────────
client.login(DISCORD_TOKEN);
