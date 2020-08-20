'use strict';
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  async delete(ctx) {
    const { id } = ctx.params;

    const presenceEntity = await strapi.query('presence').findOne({ id: id });

    await strapi.query('comment').delete({ band_event: presenceEntity.band_event.id, user: presenceEntity.user.id });
    const entity = await strapi.query('presence').delete({ id: id });
    return sanitizeEntity(entity, { model: strapi.models['presence'] });
  }
};
