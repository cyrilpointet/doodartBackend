'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  addInvitation: async ctx => {
    const { bandId, userEmail, isFromBand } = ctx.request.body;
    const entities = await strapi.services.band.find({ id: bandId });
    const band = entities[0]
    let error = null;

    // test members
    band.members.forEach(member => {
      if (member.email === userEmail) {
        error = 'already member'
      }
    })

    //test invitations
    band.invitations.forEach(invitation => {
      if (invitation.userEmail === userEmail) {
        error = 'pending invitation'
      }
    })

    if (error !== null) {
      ctx.send({
        message: error
      }, 400);
    } else {
      band.invitations.push({
        userEmail,
        isFromBand
      })
      const updatedBand = await strapi.services.band.update(
        {id: band.id},
        {invitations: band.invitations}
      );
      return sanitizeEntity(updatedBand, { model: strapi.models.band });
    }
  },
  processInvitation: async ctx => {
    let error = null
    const { bandId, invitationId, value } = ctx.request.body;
    const band = await strapi.query('band').findOne({id: bandId})

    // Delete invitation
    const updateInvitations = band.invitations.filter(elem => elem.id !== invitationId);
    let updatedBand = await strapi.services.band.update(
      {id: bandId},
      {invitations: updateInvitations}
    );

    if (value === true) {
      const invitation = await band.invitations.find(elem => elem.id === invitationId);
      const member = await strapi.query('user', 'users-permissions').findOne({ email: invitation.userEmail });
      // test member exist
      if (member === null) {
        error = 'unknown user';
        await ctx.send({
          message: error
        }, 400);
        return
      }
      band.members.push(member.id)
      updatedBand = await strapi.services.band.update(
        {id: bandId},
        {members: band.members}
      );
    }

    return sanitizeEntity(updatedBand, { model: strapi.models.band });
  },
};
