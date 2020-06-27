const AppConfig = {
  socket_io_url: process.env.REACT_APP_SOCKET_IO_URL || '',
  dateFormat: 'Y-M-D HH:mm ss',
};

const RelaySwitch = {
  INVERTER: 'INVERTER',
  COOLING_FAN: 'COOLING_FAN',
  LIGHT: 'LIGHT',
  SPOTLIGHT: 'SPOTLIGHT',
  WATER_FALL_PUMP: 'WATER_FALL_PUMP',
  WATER_SPRINKLER: 'WATER_SPRINKLER',
};

export { AppConfig, RelaySwitch };
