/**
 * Formatter is a utility for formatting SQL results to a JS Object or array of objects
 */
const _ = require('lodash');

const toClient = (locRow) => {
  return {
    sid: parseInt(_.get(locRow, 'sid')),
    uid: parseInt(_.get(locRow, 'uid')),
    lStatus: _.get(locRow, 'l_status'),
    account: _.get(locRow, 'account'),
    street1: _.get(locRow, 'street1'),
    street2: _.get(locRow, 'street2'),
    crossStreet: _.get(locRow, 'cross_street'),
    name: _.get(locRow, 'location_name'),
    city: _.get(locRow, 'city'),
    state: _.get(locRow, 'state'),
    zip: _.get(locRow, 'postal_code'),
    county: _.get(locRow, 'municipality'),
    country: _.get(locRow, 'country'),
    notes: _.get(locRow, 'dispatch_notes'),
    residenceType: _.get(locRow, 'residence_type'),
    numAdults: _.get(locRow, 'num_adults'),
    numChildren: _.get(locRow, 'num_children'),
    safeWord: _.get(locRow, 'abort'),
    signature: _.get(locRow, 'signature'),
    timeZone: _.get(locRow, 'time_zone'),
    locationOffset: _.get(locRow, 'locationOffset'),
    primaryContacts: [
      {
        name: `${_.get(locRow, 'first_name', '')}${_.get(locRow, 'last_name') ? ' ' : ''}${_.get(locRow, 'last_name', '')}`,
        phone: _.get(locRow, 'phone'),
      },
      {
        name: `${_.get(locRow, 'first_name2', '')}${_.get(locRow, 'last_name2') ? ' ' : ''}${_.get(locRow, 'last_name2', '')}`,
        phone: _.get(locRow, 'phone2'),
      },
    ],
    secondaryContacts: [
      {
        name: _.get(locRow, 'contact_name1'),
        phone: _.get(locRow, 'contact_phone1'),
      },
      {
        name: _.get(locRow, 'contact_name2'),
        phone: _.get(locRow, 'contact_phone2'),
      },
      {
        name: _.get(locRow, 'contact_name3'),
        phone: _.get(locRow, 'contact_phone3'),
      },
      {
        name: _.get(locRow, 'contact_name4'),
        phone: _.get(locRow, 'contact_phone4'),
      },
      {
        name: _.get(locRow, 'contact_name5'),
        phone: _.get(locRow, 'contact_phone5'),
      },
    ],
    videoVerification: Boolean(_.get(locRow, 'enable_cops_video')),
    certificateUri: `https://simplisafe.com/account2/${_.get(locRow, 'uid')}/alarm-certificate/${_.get(locRow, 'sid')}`,
    licenseNumber: _.get(locRow, 'license_number'),
    licenseExpiration: _.get(locRow, 'license_expiration'),
    templateId: _.get(locRow, 'template_id'),
    names: _.get(locRow, 'names'),
    modified: _.get(locRow, 'modified'),
    dispatchNumbers: {
      police1: _.get(locRow, 'pd_phone1'),
      police2: _.get(locRow, 'pd_phone2'),
      fire1: _.get(locRow, 'fd_phone1'),
      fire2: _.get(locRow, 'fd_phone2'),
      guard1: _.get(locRow, 'guard_phone1'),
      guard2: _.get(locRow, 'guard_phone2'),
    },
    securitasInfo: {
      siteNo: _.get(locRow, 'site_no'),
      sitestatId: _.get(locRow, 'sitestat_id'),
      csNo: _.get(locRow, 'cs_no'),
    },
  };
};

const fromClient = (location) => {
  const primaryContacts = _.get(location, 'primaryContacts');

  let loc = {
    sid: _.get(location, 'sid'),
    uid: _.get(location, 'uid'),
    l_status: _.get(location, 'lStatus'),
    account: _.get(location, 'account'),
    street1: _.get(location, 'street1'),
    street2: _.get(location, 'street2'),
    cross_street: _.get(location, 'crossStreet'),
    location_name: _.get(location, 'name'),
    city: _.get(location, 'city'),
    state: _.get(location, 'state'),
    postal_code: _.get(location, 'zip'),
    municipality: _.get(location, 'county'),
    country: _.get(location, 'country'),
    dispatch_notes: _.get(location, 'notes'),
    residence_type: _.get(location, 'residenceType'),
    num_adults: _.get(location, 'numAdults'),
    num_children: _.get(location, 'numChildren'),
    abort: _.get(location, 'safeWord'),
    signature: _.get(location, 'signature'),
    time_zone: _.get(location, 'timeZone'),

    contact_name1: _.get(location, 'secondaryContacts[0].name'),
    contact_phone1: _.get(location, 'secondaryContacts[0].phone'),

    contact_name2: _.get(location, 'secondaryContacts[1].name'),
    contact_phone2: _.get(location, 'secondaryContacts[1].phone'),

    contact_name3: _.get(location, 'secondaryContacts[2].name'),
    contact_phone3: _.get(location, 'secondaryContacts[2].phone'),

    contact_name4: _.get(location, 'secondaryContacts[3].name'),
    contact_phone4: _.get(location, 'secondaryContacts[3].phone'),

    contact_name5: _.get(location, 'secondaryContacts[4].name'),
    contact_phone5: _.get(location, 'secondaryContacts[4].phone'),

    pd_phone1: _.get(location, 'dispatchNumbers.police1'),
    pd_phone2: _.get(location, 'dispatchNumbers.police2'),
    fd_phone1: _.get(location, 'dispatchNumbers.fire1'),
    fd_phone2: _.get(location, 'dispatchNumbers.fire2'),
    guard_phone1: _.get(location, 'dispatchNumbers.guard1'),
    guard_phone2: _.get(location, 'dispatchNumbers.guard2'),

    names: _.get(location, 'names'),
    license_number: _.get(location, 'licenseNumber'),
    license_expiration: _.get(location, 'licenseExpiration'),
    template_id: _.get(location, 'templateId'),

    site_no: _.get(location, 'sercuritasInfo.siteNo'),
    sitestat_id: _.get(location, 'sercuritasInfo.sitestatId'),
    cs_no: _.get(location, 'sercuritasInfo.csNo'),
  };

  // Conditionally Set Primary Contacts
  if (primaryContacts) {
    let name1 = _.get(primaryContacts, '[0].name');
    if (name1) {
      _.set(loc, 'first_name', name1.split(' ')[0]);
      _.set(loc, 'last_name', name1.split(' ')[1]);
    }

    let phone1 = _.get(primaryContacts, '[0].phone');
    if (phone1) _.set(loc, 'phone', phone1);

    let name2 = _.get(primaryContacts, '[1].name');
    if (name2) {
      _.set(loc, 'first_name2', name2.split(' ')[0]);
      _.set(loc, 'last_name2', name2.split(' ')[1]);
    }

    let phone2 = _.get(primaryContacts, '[1].phone');
    if (phone2) _.set(loc, 'phone2', phone2);
  }

  // Only Set VideoVerification if it was passed in
  if (!_.isNil(_.get(location, 'videoVerification'))) {
    _.set(loc, 'enable_cops_video', _.get(location, 'videoVerification') === true ? 1 : 0);
  }

  return loc;
};


// Remove Any Fields not in the Database
function clean(location) {
  return _.pick(location, [
    'modified',
    'sid',
    'uid',
    'l_status',
    'account',
    'abort',
    'signature',
    'first_name',
    'last_name',
    'phone',
    'phone2',
    'street1',
    'street2',
    'city',
    'zone',
    'postal_code',
    'municipality',
    'cross_street',
    'dispatch_notes',
    'contact_name1',
    'contact_phone1',
    'contact_name2',
    'contact_phone2',
    'contact_name3',
    'contact_phone3',
    'contact_name4',
    'contact_phone4',
    'contact_name5',
    'contact_phone5',
    'names',
    'time_zone',
    'residence_type',
    'num_adults',
    'num_children',
    'pd_phone1',
    'pd_phone2',
    'fd_phone1',
    'fd_phone2',
    'license_number',
    'license_expiration',
    'template_id',
    'guard_phone1',
    'guard_phone2',
    'mfa',
    'enable_cops_video',
    'first_name2',
    'last_name2',
    'location_name',
    'enable_smashsafe',
    'site_no',
    'enable_securitas_video',
    'sitestat_id',
    'cs_no',
    'country_id',
  ]);
}

module.exports = {
  toClient,
  fromClient,
  clean,
};
