'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  create: async ctx => {
    const { band, userEmail, isFromBand } = ctx.request.body;

    // test band exist
    const bandEntity = await strapi.services.band.findOne({ id: band });
    if (bandEntity === null) {
      await ctx.send({
        message: 'unknown band'
      }, 400);
      return
    }

    // test member in band
    const membersWithEmail = bandEntity.members.filter(member => member.email === userEmail);
    if (membersWithEmail.length !== 0) {
      await ctx.send({
        message: 'member in band'
      }, 400);
      return
    }
    const invitationEntity = await strapi.query('invitation').findOne({ band: band, userEmail: userEmail });

    // test invitation pending
    if (invitationEntity !== null) {
       await ctx.send({
        message: 'invitation pending'
      }, 400);
       return
    }

    const invitation = await strapi.services.invitation.create({
      band, userEmail, isFromBand
    })

    return sanitizeEntity(invitation, { model: strapi.models.invitation })
  }
};
