'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

async function getQueryingUserId(request) {
  const decrypted = await strapi.plugins[
    'users-permissions'
    ].services.jwt.getToken(request);
  return decrypted.id
}

module.exports = {
  async delete(ctx) {
    const { id } = ctx.params;

    const userId = await getQueryingUserId(ctx);
    const bandEntity = await strapi.query('band').findOne({ id: id });
    if (userId !== bandEntity.manager.id) {
      await ctx.send({
        message: 'not a manager'
      }, 403);
      return
    }

    await strapi.query('invitation').delete({ band: id });
    await strapi.query('band-event').delete({ band: id });
    await strapi.query('presence').delete({ 'band-event': null });
    const entity = await strapi.query('band').delete({ id });
    return sanitizeEntity(entity, { model: strapi.models.band });
  },

  removeMember: async ctx => {
    const {bandId, memberId} = ctx.request.body;
    const userId = await getQueryingUserId(ctx);

    const bandEntity = await strapi.query('band').findOne({ id: bandId });

    if (userId !== memberId && userId !== bandEntity.manager.id) {
      await ctx.send({
        message: 'not self user nor manager'
      }, 403);
      return
    }

    if (memberId === bandEntity.manager.id) {
      await ctx.send({
        message: 'manager can\'t leave band'
      }, 400);
      return
    }

    const newMembers = bandEntity.members.filter(member => member.id !== memberId);
    const updatedBand = await strapi.services.band.update(
      {id: bandEntity.id},
      {members: newMembers}
    );

    const presencePromises = [];
    updatedBand.band_events.forEach(event => {
      presencePromises.push(
        strapi.query('presence').delete({ band_event: event.id, user: memberId })
      )
    })
    await Promise.all(presencePromises);
    return sanitizeEntity(updatedBand, { model: strapi.models.band });
  },

  processInvitation: async ctx => {
    const { invitationId, value } = ctx.request.body;
    const invitationEntity = await strapi.query('invitation').findOne({ id: invitationId });

    if (invitationEntity === null) {
      await ctx.send({
        message: 'invitation not found'
      }, 400);
      return
    }

    const bandEntity = await strapi.query('band').findOne({ id: invitationEntity.band.id });
    const userEntity = await strapi.query('user', 'users-permissions').findOne({ email: invitationEntity.userEmail });

    await strapi.query('invitation').delete({ id: invitationId });

    if (bandEntity === null || userEntity === null) {
      await ctx.send({
        message: 'band or user not found'
      }, 400);
      return
    }

    const members = bandEntity.members.filter(member => member.id === userEntity.id);
    if (members.length !== 0) {
      await ctx.send({
        message: 'member in band'
      }, 400);
      return
    }

    if (value === true) {
      bandEntity.members.push(userEntity.id)
    }
    const updatedBand = await strapi.services.band.update(
      {id: bandEntity.id},
      {members: bandEntity.members}
    );
    return sanitizeEntity(updatedBand, { model: strapi.models.band });
  },
};
