import React from 'react'
import { Header, Table, Progress } from 'semantic-ui-react'
import type { SemanticCOLORS } from 'semantic-ui-react'

interface Rating {
  average: number
  total: number
  fiveStars: number
  fourStars: number
  threeStars: number
  twoStars: number
  oneStar: number
}

const RatingComponent: React.FC<{ rating: Rating }> = ({ rating }) => {
  // Function to create a single rating row
  const createRatingRow = (
    name: string,
    value: number,
    total: number,
    color: SemanticCOLORS
  ) => {
    const percentage = (value / total) * 100

    return (
      <Table.Row key={`stars_${name}`}>
        <Table.Cell>
          <Progress
            color={color}
            active
            percent={percentage}
            label={`${name} stars (${value} votes)`}
          />
        </Table.Cell>
      </Table.Row>
    )
  }

  return (
    <Table compact>
      <Table.Body>
        <Table.Row>
          <Table.Cell textAlign="center">
            <Header as="h3">Rating: {rating.average}</Header>
          </Table.Cell>
        </Table.Row>

        {createRatingRow('5', rating.fiveStars, rating.total, 'green')}
        {createRatingRow('4', rating.fourStars, rating.total, 'orange')}
        {createRatingRow('3', rating.threeStars, rating.total, 'yellow')}
        {createRatingRow('2', rating.twoStars, rating.total, 'red')}
        {createRatingRow('1', rating.oneStar, rating.total, 'red')}
      </Table.Body>
    </Table>
  )
}

export default RatingComponent
