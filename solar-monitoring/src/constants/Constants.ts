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
  WATER_THE_PLANTS: 'WATER_THE_PLANTS',
  WATER_SPRINKLER: 'WATER_SPRINKLER',
  LIVINGROOM_LIGHT: 'LIVINGROOM_LIGHT',
  GARDEN_LIGHT: 'GARDEN_LIGHT',
  CHECKING: 'CHECKING',
  RESET_ENERGY: 'ENERGY_RESET',
};

const Device = {
  SOLAR_BOX: 'ESP32',
  FARM_BOT: 'ESP8266',
  HOME_CONTROL: 'ESP01',
};

const LocalStorageConfig = {
  defaultActiveTab: 'defaultActiveTab',
};

export { AppConfig, RelaySwitch, LocalStorageConfig, Device };
