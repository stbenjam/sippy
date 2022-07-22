import { Line } from 'react-chartjs-2'
import Alert from '@material-ui/lab/Alert'
import chroma from 'chroma-js'
import React, { useEffect } from 'react'

export default function BuildClusterHealthChart(props) {
  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState([])

  const fetchData = () => {
    fetch(process.env.REACT_APP_API_URL + '/api/health/build_cluster')
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        setData(json)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError('Could not retrieve release tag data ' + error)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (!isLoaded) {
    return <p>Loading...</p>
  }

  const now = new Date()
  let last14Days = [],
    d = new Date(),
    count = 0
  for (
    ;
    count < 14;
    d.setDate(now.getDate() - count),
      last14Days.unshift(d.toISOString().split('T')[0]),
      count++
  );

  const colors = chroma
    .scale('Spectral')
    .mode('lch')
    .colors(Object.keys(data).length)

  const chartData = {
    labels: last14Days,
    datasets: [],
  }

  const options = {
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            console.log(context)
            return `${context.dataset.label} ${context.formattedValue}%`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          z: 1,
        },
      },
      y: {
        grid: {
          z: 1,
        },
        max: 100,
        ticks: {
          callback: (value, index, values) => {
            return `${value}%`
          },
        },
      },
    },
  }

  Object.keys(data).forEach((cluster, index) => {
    chartData.datasets.push({
      label: cluster === 'overall' ? 'Mean' : cluster,
      borderDash: cluster === 'overall' ? [5, 2] : undefined,
      borderColor: cluster === 'overall' ? 'black' : colors[index],
      backgroundColor: cluster === 'overall' ? 'black' : colors[index],
      data: last14Days.map((day) =>
        data[cluster].by_period[day]
          ? data[cluster].by_period[day].current_pass_percentage
          : NaN
      ),
      tension: 0.4,
    })
  })
  console.log(chartData)

  return <Line key="build-cluster-chart" options={options} data={chartData} />
}
