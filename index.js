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
const EMBED_COLOR    = 0xFFD700; // Amarillo / Gold
const BUTTON_ID      = 'refresh_status';

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
  const name      = data.name            ?? 'Unknown';
  const passing   = data.passing         ?? false;
  const platform  = data.platform        ?? '—';
  const url       = data.request?.url    ?? '—';

  // Latest event info
  const duration   = data.latest_event?.metrics?.duration ?? null;
  const host       = data.latest_event?.host              ?? '—';
  const regionName = REGION_LABELS[host] || host;

  // SSL info
  const sslExpires = data.attributes?.site?.ssl?.expires_at ?? null;
  const sslIssuer  = data.attributes?.site?.ssl?.issued_by  ?? '—';

  // Status formatting
  const statusIcon = passing ? '🟢' : '🔴';
  const statusText = passing ? 'Operativo' : 'Caído';

  // Duration formatting
  const durationText = duration !== null
    ? `${(duration * 1000).toFixed(0)} ms`
    : '—';

  // SSL expiration formatting
  let sslText = '—';
  if (sslExpires) {
    const expiresDate = new Date(sslExpires);
    const now         = new Date();
    const daysLeft    = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
    const dateStr     = expiresDate.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    sslText = `${dateStr}  (${daysLeft} días restantes)`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊  Panel de Estado — ${name}`)
    .setColor(EMBED_COLOR)
    .setDescription(
      `Estado actual del monitor **${name}** consultado desde la API de Cronitor.`
    )
    .addFields(
      {
        name: '🔗  URL Monitoreada',
        value: `[${url}](${url})`,
        inline: false,
      },
      {
        name: '📡  Estado',
        value: `${statusIcon}  **${statusText}**`,
        inline: true,
      },
      {
        name: '⚙️  Plataforma',
        value: platform.toUpperCase(),
        inline: true,
      },
      {
        name: '⏱️  Latencia',
        value: `\`${durationText}\``,
        inline: true,
      },
      {
        name: '🌍  Región del Ping',
        value: regionName,
        inline: true,
      },
      {
        name: '🔒  Expiración SSL',
        value: sslText,
        inline: true,
      },
      {
        name: '🏢  Emisor SSL',
        value: sslIssuer,
        inline: true,
      },
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
    .setLabel('🔄 Actualizar')
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
