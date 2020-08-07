'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
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
