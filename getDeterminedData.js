// AWS SDK를 불러옵니다.
const AWS = require('aws-sdk');

// DynamoDB 문서 클라이언트를 초기화합니다.
const documentClient = new AWS.DynamoDB.DocumentClient();

// Lambda 함수 핸들러를 정의합니다.
exports.handler = async (event) => {
    // 응답을 위한 HTTP 헤더를 정의합니다.
    const headers = {
        'Content-Type': 'application/json',
    };

    // DynamoDB 테이블 이름을 설정합니다.
    const tableName = 'weather-cctv';

    try {
        // DynamoDB scan 작업을 사용하여 모든 항목을 검색합니다.
        const data = await documentClient.scan({TableName: tableName}).promise();

        // 검색된 항목을 반환합니다.
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        // 에러가 발생한 경우 에러 메시지를 반환합니다.
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({error: error.message}),
        };
    }
};
