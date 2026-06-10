import {Fragment} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type BodyScienceRichContentProps = {
  content: string;
};

function cleanLine(line: string) {
  return line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '');
}

function RichText({text, style}: {text: string; style: any}) {
  const {theme} = useAppTheme();
  const parts = text.split(/\*\*(.*?)\*\*/g);

  const styles = StyleSheet.create({
    strong: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Text style={style}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index % 2 === 1 ? (
            <Text style={styles.strong}>{part}</Text>
          ) : (
            part
          )}
        </Fragment>
      ))}
    </Text>
  );
}

export function BodyScienceRichContent({content}: BodyScienceRichContentProps) {
  const {theme} = useAppTheme();
  const blocks = content.split('\n\n').filter(Boolean);

  const styles = StyleSheet.create({
    container: {
      gap: 14,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 24,
      letterSpacing: -0.3,
      marginTop: 8,
    },
    paragraph: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 22,
    },
    list: {
      gap: 9,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.textPrimary,
      marginTop: 8,
    },
    listText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        if (block.startsWith('## ')) {
          return (
            <Text key={`${block}-${index}`} style={styles.heading}>
              {block.replace('## ', '')}
            </Text>
          );
        }

        const lines = block.split('\n').filter(Boolean);
        const isList = lines.length > 1 || /^(-|\d+\.)\s/.test(block);

        if (isList) {
          return (
            <View key={`${block}-${index}`} style={styles.list}>
              {lines.map((line, lineIndex) => (
                <View key={`${line}-${lineIndex}`} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <RichText text={cleanLine(line)} style={styles.listText} />
                </View>
              ))}
            </View>
          );
        }

        return (
          <RichText
            key={`${block}-${index}`}
            text={block}
            style={styles.paragraph}
          />
        );
      })}
    </View>
  );
}
