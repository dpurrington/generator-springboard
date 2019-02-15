let constants = {
  // SERVICE CONSTANTS
  SERVICE: {
    CANCELED: -10,
    NOT_ACTIVATED: 0,
    SUSPENDED: 5,
    CAMERA_ONLY: 7,
    PRACTICE_MODE: 10,
    ACTIVATED: 20,
  },

  DISPATCHER_FROM_COUNTRY_ID: {
    840: 'cops',
    826: 'securitas',
  },

  COUNTRY_ID: {
    US: 840,
    GB: 826,
  },

  ONE_MONTH_IN_SECONDS: 2628000,

  SERVICE_PLANS: {
    BLANK: 'SSBCV1',
    CAMERA_ONLY: 'SSEDCM1',
    CAMERA_UNLIMITED: 'SSEDCMU',
    BASIC_MONITORING: 'SSEDBM1',
    BASIC_WITH_CAMERA: 'SSEDBC1',
    INTERACTIVE: 'SSEDSM2',
  },

  TIMEZONES: {
    TO_STRING: {
      // US TIMEZONES
      0: 'America/New_York',
      1: 'America/Chicago',
      2: 'America/Denver',
      3: 'America/Los_Angeles',
      4: 'America/Puerto_Rico',
      5: 'America/Phoenix',
      6: 'Pacific/Honolulu',
      7: 'America/Anchorage',

      // NON-US TIMEZONES
      8: 'Europe/London',
    },
    FROM_STRING: {
      // US TIMEZONES
      'America/New_York': 0,
      'America/Chicago': 1,
      'America/Denver': 2,
      'America/Los_Angeles': 3,
      'America/Puerto_Rico': 4,
      'America/Phoenix': 5,
      'Pacific/Honolulu': 6,
      'America/Anchorage': 7,

      // NON-US TIMEZONES
      'Europe/London': 8,
    },
  },
};

module.exports = constants;
