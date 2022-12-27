require('dotenv').config();
const fs = require('fs');

const { S3Client, ListObjectsCommand } = require('@aws-sdk/client-s3');

const env = process.env;

const printPage = async (marker, page) => {
  let ending = false;
  const opts = {
    Bucket: env.AWS_BUCKET,
    MaxKeys: '1000',
    Marker: marker,
  };

  if (marker !== '') opts.Marker = marker;

  const client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_KEY,
      secretAccessKey: env.AWS_SEC,
    },
  });
  const command = new ListObjectsCommand(opts);
  const response = await client.send(command);

  const getKeyUrlList = (contents) => {
    const ObjectUrl = `https://${env.AWS_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/`;

    let keyUrlArr = [];

    for (let i = 0; i < contents.length - 1; i++) {
      keyUrlArr.push(ObjectUrl + response.Contents[i]['Key']);
    }
    return keyUrlArr;
  };

  const keyUrlArr = await getKeyUrlList(response.Contents);

  if (response.Contents && response.Contents.length >= 1) {
    fs.writeFileSync(
      `./_results/${process.env.AWS_BUCKET.toLowerCase()}_objectList_page_${page}__${Date.now()}.json`,
      JSON.stringify(keyUrlArr, null, 2)
    );
  }

  if (!keyUrlArr) ending = true;
  return { data: keyUrlArr || {}, isEnd: ending };
};

(async () => {
  let page = 1;
  let marker = '';
  let totalObjects = 0;

  while (marker !== undefined) {
    const ress = await printPage(marker, page);

    if (!ress.isEnd && ress.data && ress.data.length >= 1) {
      marker = ress.data[ress.data.length - 1].Key || undefined;
      totalObjects += ress.data.length;
      page++;
    }

    if (ress.isEnd) marker = undefined;
  }

  console.log(
    `💾 A list of ${totalObjects} object urls in your s3 bucket was created, and a total of ${--page} page was created in the _results folder. 💾`
  );
})();
