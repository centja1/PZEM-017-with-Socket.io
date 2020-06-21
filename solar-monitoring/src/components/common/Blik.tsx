import React from 'react';

const Blik = (status: boolean) => {
  return status ? (
    <div className='led-box' style={{ marginRight: '10px' }}>
      <div className='led-green' style={{ marginLeft: '5px' }}></div>
    </div>
  ) : (
    <div className='led-box' style={{ marginRight: '10px' }}>
      <div className='led-red' style={{ marginLeft: '5px' }}></div>
    </div>
  );
};

export default Blik;
