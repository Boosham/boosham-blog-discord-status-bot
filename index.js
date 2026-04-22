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
const EMBED_COLOR    = 1633029; // #18EB05 (Nuevo color según JSON)
const BUTTON_ID      = 'p_286642288384282625';
const CHANNEL_ID     = '1489026084602122434'; // Canal fijo de status

// (REGION_LABELS ya no es necesario con el nuevo diseño)

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

  const embed = new EmbedBuilder()
    .setTitle('Status de Paginas Web')
    .setColor(EMBED_COLOR);

  if (passing) {
    embed.setDescription(
      "Puedes Mirar el Status Detallado  (AQUI https://booshamblog.alwaysdata.net/)\n\n" +
      "Disponibilidad en Diferentes Partes del Mundo:\n\n" +
      "🇦🇺 Sydney, Australia          \n" +
      " <:circle_check:1496341223559004271>  Operativo\n\n" +
      "🇧🇷 São Paulo, Brazil\n" +
      " <:circle_check:1496341223559004271>  Operativo\n\n" +
      "🇩🇪 Frankfurt, Germany\n" +
      " <:circle_check:1496341223559004271>  Operativo\n\n" +
      "🇺🇸 Virginia, USA\n" +
      " <:circle_check:1496341223559004271>  Operativo"
    );
  } else {
    embed.setDescription(
      "Puedes Mirar el Status Detallado  (AQUI https://booshamblog.alwaysdata.net/)\n\n" +
      "Disponibilidad en Diferentes Partes del Mundo:\n\n" +
      "🇦🇺 Sydney, Australia          \n" +
      " <:circle_x:1496343329594675291>  Caido (Ping)\n\n" +
      "🇧🇷 São Paulo, Brazil\n" +
      "  <:circle_x:1496343329594675291>  Caido (Ping)\n\n" +
      "🇩🇪 Frankfurt, Germany\n" +
      "  <:circle_x:1496343329594675291>  Caido (Ping)\n\n" +
      "🇺🇸 Virginia, USA\n" +
      "  <:circle_x:1496343329594675291>  Caido (Ping)"
    );
  }

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
//  Auto-update logic for the fixed channel
// ─────────────────────────────────────────────────────────────
async function updateStatusInChannel() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error(`❌ No se encontró el canal ${CHANNEL_ID}`);

    const data = await fetchCronitorStatus();
    const embed = buildStatusEmbed(data);
    const row = buildButtonRow();

    // Buscar el último mensaje enviado por el bot en ese canal
    const messages = await channel.messages.fetch({ limit: 10 });
    const lastBotMessage = messages.find(m => m.author.id === client.user.id);

    if (lastBotMessage) {
      await lastBotMessage.edit({ embeds: [embed], components: [row] });
      console.log('✅ Status actualizado en el canal fijo (Editado).');
    } else {
      await channel.send({ embeds: [embed], components: [row] });
      console.log('✅ Status enviado al canal fijo (Nuevo mensaje).');
    }
  } catch (err) {
    console.error('❌ Error actualizando status automático:', err.message);
  }
}

client.once('ready', () => {
  console.log(`✅  Bot conectado como ${client.user.tag}`);
  
  // Ejecutar actualización inicial
  updateStatusInChannel();
  
  // Programar actualización cada 5 minutos
  setInterval(updateStatusInChannel, 5 * 60 * 1000);
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
