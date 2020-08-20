'use strict';
const { sanitizeEntity } = require('strapi-utils');

async function getQueryingUserId(request) {
  const decrypted = await strapi.plugins[
    'users-permissions'
    ].services.jwt.getToken(request);
  return decrypted.id
}

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const eventEntity = await strapi.query('band-event').findOne({ id: id }, ['band.members', 'band.manager', 'presences.user', 'manager', 'comments.user']);

    return sanitizeEntity(eventEntity, { model: strapi.models['band-event'] });
  },

  async create(ctx) {
    const { band, description, end, manager, name, place, start, presences } = ctx.request.body;

    // test user in band
    const userId = await getQueryingUserId(ctx);
    const bandEntity = await strapi.query('band').findOne({ id: band });
    const members = bandEntity.members.filter(member => member.id === userId);
    if (members.length === 0) {
      await ctx.send({
        message: 'not a band member'
      }, 403);
      return
    }

    const entity = await strapi.query('band-event').create({band, description, end, manager, name, place, start});

    const presencePromises = [];
    presences.forEach(presence => {
      console.log(entity.id);
      presencePromises.push(
        strapi.query('presence').create({
          band_event: entity.id,
          user: presence
        })
      )
    })
    await Promise.all(presencePromises);
    const newEntity = await strapi.query('band-event').findOne({id: entity.id}, ['band.members', 'band.manager', 'presences.user', 'manager', 'comments.user'])
    return sanitizeEntity(newEntity, { model: strapi.models['band-event'] });
  },

  async update(ctx) {
    const { id } = ctx.params;
    await strapi.query('band-event').update({ id: id }, ctx.request.body);
    const eventEntity = await strapi.query('band-event').findOne({ id: id }, ['band.members', 'band.manager', 'presences.user', 'manager', 'comments.user']);

    return sanitizeEntity(eventEntity, { model: strapi.models['band-event'] });
  },

  async delete(ctx) {
    const { id } = ctx.params;

    const userId = await getQueryingUserId(ctx);
    const eventEntity = await strapi.query('band-event').findOne({ id: id });
    const bandEntity = await strapi.query('band').findOne({ id: id });
    if (userId !== eventEntity.manager.id && userId !== bandEntity.manager.id) {
      await ctx.send({
        message: 'not a manager'
      }, 403);
      return
    }

    await strapi.query('presence').delete({ band_event: id });
    await strapi.query('comment').delete({ band_event: id });
    const entity = await strapi.query('band-event').delete({ id: id });
    return sanitizeEntity(entity, { model: strapi.models['band-event'] });
  },
};
