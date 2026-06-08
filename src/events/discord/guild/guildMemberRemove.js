import { db } from "#database/DatabaseManager";
import { logger } from "#utils/logger";

export default {
  name: "guildMemberRemove",
  async execute(member, client) {
    if (member.user.bot) return;

    const guildId = member.guild.id;

    try {
      const memberData = db.invites.getMemberInvites(guildId, member.id);

      if (memberData && memberData.inviter_id) {
        db.invites.incrementLeft(guildId, memberData.inviter_id, 1);
        logger.debug("InviteTracker", `${member.user.tag} left, incrementing left count for inviter ${memberData.inviter_id}`);
      }
    } catch (error) {
      logger.error("InviteTracker", `Error handling member leave for ${member.user.tag}:`, error);
    }
  },
};
