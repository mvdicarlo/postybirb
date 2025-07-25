import { Container, Paper, Space, Stack, Text, Title } from '@mantine/core';
import { SelectOption } from '@postybirb/form-builder';
import { useState } from 'react';
import { CascadeSelect } from './form/fields/select';

// Example hierarchical data structure
const locationOptions: SelectOption[] = [
  {
    label: 'Asia',
    items: [
      {
        label: 'China',
        items: [
          { label: 'Beijing', value: 'asia-china-beijing' },
          { label: 'Shanghai', value: 'asia-china-shanghai' },
          { label: 'Guangzhou', value: 'asia-china-guangzhou' },
        ],
      },
      {
        label: 'Japan',
        items: [
          { label: 'Tokyo', value: 'asia-japan-tokyo' },
          { label: 'Osaka', value: 'asia-japan-osaka' },
          { label: 'Kyoto', value: 'asia-japan-kyoto' },
        ],
      },
      {
        label: 'South Korea',
        items: [
          { label: 'Seoul', value: 'asia-korea-seoul' },
          { label: 'Busan', value: 'asia-korea-busan' },
        ],
      },
    ],
  },
  {
    label: 'Europe',
    items: [
      {
        label: 'United Kingdom',
        items: [
          { label: 'London', value: 'europe-uk-london' },
          { label: 'Manchester', value: 'europe-uk-manchester' },
          { label: 'Edinburgh', value: 'europe-uk-edinburgh' },
        ],
      },
      {
        label: 'Germany',
        items: [
          { label: 'Berlin', value: 'europe-germany-berlin' },
          { label: 'Munich', value: 'europe-germany-munich' },
          { label: 'Hamburg', value: 'europe-germany-hamburg' },
        ],
      },
      {
        label: 'France',
        items: [
          { label: 'Paris', value: 'europe-france-paris' },
          { label: 'Lyon', value: 'europe-france-lyon' },
          { label: 'Marseille', value: 'europe-france-marseille' },
        ],
      },
    ],
  },
  {
    label: 'North America',
    items: [
      {
        label: 'United States',
        items: [
          { label: 'New York', value: 'na-us-newyork' },
          { label: 'Los Angeles', value: 'na-us-losangeles' },
          { label: 'Chicago', value: 'na-us-chicago' },
        ],
      },
      {
        label: 'Canada',
        items: [
          { label: 'Toronto', value: 'na-canada-toronto' },
          { label: 'Vancouver', value: 'na-canada-vancouver' },
          { label: 'Montreal', value: 'na-canada-montreal' },
        ],
      },
    ],
  },
];

const skillOptions: SelectOption[] = [
  {
    label: 'Programming',
    items: [
      {
        label: 'Frontend',
        items: [
          { label: 'React', value: 'programming-frontend-react' },
          { label: 'Vue.js', value: 'programming-frontend-vue' },
          { label: 'Angular', value: 'programming-frontend-angular' },
          { label: 'TypeScript', value: 'programming-frontend-typescript' },
        ],
      },
      {
        label: 'Backend',
        items: [
          { label: 'Node.js', value: 'programming-backend-nodejs' },
          { label: 'Python', value: 'programming-backend-python' },
          { label: 'Java', value: 'programming-backend-java' },
          { label: 'C#', value: 'programming-backend-csharp' },
        ],
      },
      {
        label: 'Database',
        items: [
          { label: 'PostgreSQL', value: 'programming-database-postgresql' },
          { label: 'MongoDB', value: 'programming-database-mongodb' },
          { label: 'Redis', value: 'programming-database-redis' },
        ],
      },
    ],
  },
  {
    label: 'Design',
    items: [
      {
        label: 'UI/UX',
        items: [
          { label: 'Figma', value: 'design-uiux-figma' },
          { label: 'Sketch', value: 'design-uiux-sketch' },
          { label: 'Adobe XD', value: 'design-uiux-adobexd' },
        ],
      },
      {
        label: 'Graphic Design',
        items: [
          { label: 'Photoshop', value: 'design-graphic-photoshop' },
          { label: 'Illustrator', value: 'design-graphic-illustrator' },
          { label: 'InDesign', value: 'design-graphic-indesign' },
        ],
      },
    ],
  },
];

export function CascadeSelectDemo(): JSX.Element {
  const [singleLocation, setSingleLocation] = useState<string | null>(null);
  const [multipleSkills, setMultipleSkills] = useState<string[]>([]);

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xl">
        Cascade Select Component Demo
      </Title>
      
      <Stack gap="xl">
        <Paper p="md" withBorder>
          <Title order={3} mb="md">
            Single Selection - Location Picker
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Select a single location from the hierarchical list (Continent → Country → City)
          </Text>
          
          <CascadeSelect
            multiple={false}
            value={singleLocation}
            options={locationOptions}
            placeholder="Choose a location..."
            onChange={(option) => {
              setSingleLocation(option?.value || null);
            }}
          />
          
          <Space h="md" />
          <Text size="sm">
            <strong>Selected:</strong> {singleLocation || 'None'}
          </Text>
        </Paper>

        <Paper p="md" withBorder>
          <Title order={3} mb="md">
            Multiple Selection - Skills Picker
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Select multiple skills from different categories (Category → Subcategory → Skill)
          </Text>
          
          <CascadeSelect
            multiple={true}
            value={multipleSkills}
            options={skillOptions}
            placeholder="Choose your skills..."
            onChange={(options) => {
              setMultipleSkills(options.map(opt => opt.value));
            }}
          />
          
          <Space h="md" />
          <Text size="sm">
            <strong>Selected Skills:</strong> {multipleSkills.length > 0 ? multipleSkills.join(', ') : 'None'}
          </Text>
        </Paper>

        <Paper p="md" withBorder>
          <Title order={3} mb="md">
            Disabled State
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Example of a disabled cascade select component
          </Text>
          
          <CascadeSelect
            multiple={false}
            value={null}
            options={locationOptions}
            placeholder="This is disabled..."
            disabled
            onChange={() => {
              // No-op for disabled state
            }}
          />
        </Paper>
      </Stack>
    </Container>
  );
}
