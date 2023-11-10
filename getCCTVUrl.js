const axios = require('axios');

exports.handler = async (event) => {
    const apiKey = process.env.API_KEY;
    const url = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${apiKey}&type=ex&cctvType=2&minX=126.881936&maxX=127.1916131&minY=35.4200078&maxY=38.5181038&getType=json`;
    const lambdaUrl = 'https://lc5kgltsjismxzhpzmb3yru3qm0heejd.lambda-url.ap-northeast-2.on.aws/';

    try {
        // Make a GET request to the API
        const response = await axios.get(url);
        const cctvData = response.data.response.data;

        // Extract the required fields
        const extractedData = cctvData.map(cctv => ({
            name: cctv.cctvname,
            url: cctv.cctvurl,
            coordX: cctv.coordx,
            coordY: cctv.coordy
        }));

        // Output the extracted data
        console.log(extractedData);

        await Promise.all(extractedData.map(async data => {
            const result = await axios.post(lambdaUrl, data)
        }))


        return {statusCode: 200, body: 'Asynchronous call initiated'};

    } catch (error) {
        console.error('Error fetching CCTV data:', error);
        return {statusCode: 500, body: 'Error fetching CCTV data'};
    }
};
