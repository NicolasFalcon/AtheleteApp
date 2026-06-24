import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type EllieRichTextMessageProps = {
  content: string;
  tone?: 'assistant' | 'user';
};

type RichBlock =
  | {
      type: 'heading';
      content: string;
    }
  | {
      type: 'paragraph';
      content: string;
    }
  | {
      type: 'list';
      items: string[];
    };

export function EllieRichTextMessage({
  content,
  tone = 'assistant',
}: EllieRichTextMessageProps) {
  const {theme} = useAppTheme();
  const blocks = parseRichBlocks(content);
  const textColor =
    tone === 'user' ? theme.colors.accentContrast : theme.colors.textPrimary;
  const subtleColor =
    tone === 'user' ? 'rgba(248, 247, 243, 0.72)' : theme.colors.textSecondary;

  const styles = StyleSheet.create({
    group: {
      gap: 8,
    },
    paragraph: {
      color: textColor,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 22,
    },
    heading: {
      color: textColor,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    listWrap: {
      gap: 7,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingRight: 4,
    },
    bullet: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: subtleColor,
      marginTop: 9,
    },
    listText: {
      flex: 1,
      color: textColor,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.group}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Text key={`heading-${index}`} style={styles.heading}>
              {block.content}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={`list-${index}`} style={styles.listWrap}>
              {block.items.map((item, itemIndex) => (
                <View key={`item-${index}-${itemIndex}`} style={styles.listRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={`paragraph-${index}`} style={styles.paragraph}>
            {block.content}
          </Text>
        );
      })}
    </View>
  );
}

function sanitizeMarkdown(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function parseRichBlocks(content: string): RichBlock[] {
  const lines = sanitizeMarkdown(content).split('\n');
  const blocks: RichBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    const paragraph = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph) {
      blocks.push({type: 'paragraph', content: paragraph});
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    blocks.push({
      type: 'list',
      items: listItems,
    });
    listItems = [];
  };

  lines.forEach(rawLine => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const bulletMatch = /^(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1].trim());
      return;
    }

    const isHeading = line.length <= 42 && /:$/.test(line);
    if (isHeading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        content: line.replace(/:$/, ''),
      });
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return blocks.length > 0 ? blocks : [{type: 'paragraph', content: content.trim()}];
}
