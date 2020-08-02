import React, { useState, useEffect } from 'react';
import { db } from '../../config';

const Reports = () => {
  const [data, setData] = useState<any>([]);
  let b: any = [];

  const firebaseInitial = () => {
    var app = db.ref('data').limitToLast(1);
    app.on('child_added', function (snapshot) {
      //b.push(snapshot.val());
      setData([...b]);
    });

    // app.once('value').then(function (snapshot) {
    //   console.log(snapshot.val());
    // });
  };

  useEffect(() => {
    firebaseInitial();
    return () => firebaseInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //   useEffect(() => {
  //     console.log('data', data.length);
  //   }, [data]);

  return (
    <div>
      <div className='column is-3'>Time:{data.map((v: any) => v.time)}</div>
    </div>
  );
};

export default Reports;
