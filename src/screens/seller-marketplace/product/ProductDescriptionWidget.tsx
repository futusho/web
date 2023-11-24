import React from 'react'
import { Grid } from 'semantic-ui-react'

interface Props {
  productDescription: string | null
}

export const ProductDescriptionWidget = ({ productDescription }: Props) => {
  const description = (productDescription || '').split('\r\n')

  return (
    <Grid.Column style={{ fontSize: '12pt' }}>
      {description.map((paragraph: string, index: number) => {
        if (paragraph.trim().toString() === '') {
          return <br key={index} />
        }

        return (
          <p key={index} style={{ margin: '0 0 0.2em 0' }}>
            {paragraph.split('\n').map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>{line}</React.Fragment>
            ))}
          </p>
        )
      })}
    </Grid.Column>
  )
}
