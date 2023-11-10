import {useEffect, useState} from "react";
import {Body, Cell, Header, HeaderCell, HeaderRow, Row, Table,} from '@table-library/react-table-library/table';
import {useTheme} from '@table-library/react-table-library/theme';
import {getTheme} from '@table-library/react-table-library/baseline';

const WeatherDataTable = ({data}) => {
    const [refinedData, setRefinedData] = useState([])
    const theme = useTheme(getTheme());
    const imageUrl = 'https://weather-cctv-image-ecm.s3.ap-northeast-2.amazonaws.com'

    useEffect(() => {
        const dataMap = new Map()
        data.forEach((item) => {
            if (!dataMap.has(item.imageKey)) {
                dataMap.set(item.imageKey, {
                    cctvName: item.cctvName,
                    coordX: item.coordX,
                    coordY: item.coordY,
                    imageKey: item.imageKey,
                    time: item.time,
                    result: [
                        {
                            model: item.model,
                            weather: item.weather,
                        }
                    ],
                });
            } else {
                dataMap.get(item.imageKey).result.push({
                    model: item.model,
                    weather: item.weather,
                })
            }
        })
        setRefinedData([...dataMap.values()])
    }, [data]);

    console.log('ref', refinedData)

    if (refinedData.length === 0) {
        return (
            <div>
                Loading...
            </div>
        )
    }

    return (
        <Table data={{nodes: refinedData}} theme={theme}>
            {(tableList) => (
                <>
                    <Header>
                        <HeaderRow>
                            <HeaderCell style={{textAlign: "center"}}>CCTV</HeaderCell>
                            <HeaderCell style={{textAlign: "center"}}>ImageKey</HeaderCell>
                            <HeaderCell style={{textAlign: "center"}}>Position</HeaderCell>
                            <HeaderCell style={{textAlign: "center"}}>Time</HeaderCell>
                            <HeaderCell style={{textAlign: "center"}}>Image</HeaderCell>
                            <HeaderCell style={{textAlign: "center"}}>Result</HeaderCell>
                        </HeaderRow>
                    </Header>
                    <Body>
                        {tableList.map((item) => (
                            <Row key={item.imageKey} item={item}>
                                <Cell>{item.cctvName}</Cell>
                                <Cell>{item.imageKey}</Cell>
                                <Cell>{`${item.coordY}, ${item.coordX}`}</Cell>
                                <Cell>{`${new Date(item.time).toISOString()}`}</Cell>
                                <Cell><img src={`${imageUrl}/${item.imageKey}`}
                                           style={{width: '240px', height: '240px'}}/></Cell>
                                <Cell>
                                    <table style={{width: "100%"}}>
                                        <thead style={{textAlign: "center"}}>
                                        <tr>
                                            <th>Model</th>
                                            <th style={{textAlign: "left"}}>Weather</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {item.result.map(d => (
                                            <tr key={d.model}>
                                                <td style={{textAlign: "center"}}>{d.model}</td>
                                                <td style={{textAlign: "left"}}>{d.weather}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </Cell>
                            </Row>
                        ))}
                    </Body>
                </>
            )}
        </Table>
    )
};


function App() {

    const [data, setData] = useState([])

    useEffect(() => {
        const getAPI = async () => {
            console.log('call API')
            const res = await fetch('https://6e2xh7ofyqw5wbpvemf6vl6cpa0kblqx.lambda-url.ap-northeast-2.on.aws')
            res.json().then((data) => {
                setData(data.filter(d => !d.cctvName.includes('터널')))
            })
        };
        setInterval(getAPI, 1000 * 90)
        getAPI()
    }, [])

    return (
        <>
            <h1 style={{display: "flex", justifyContent: "center", padding : "10px 0 30px 0"}}>CCTV를 이용한 실시간 날씨 정보 시스템</h1>
            {data.length > 0 && (
                <div style={{textAlign: "center"}}>
                    <WeatherDataTable data={data}/>
                </div>
            )}
        </>
    )
}

export default App
