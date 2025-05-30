import {
  areLabelsModified,
  getChangedLabels,
  prepareLabels,
  shouldUpdateLabels,
} from './labels';
import { platform } from '~test/util';

describe('workers/repository/update/pr/labels', () => {
  describe('prepareLabels(config)', () => {
    it('returns empty array if no labels are configured', () => {
      const result = prepareLabels({});
      expect(result).toBeArrayOfSize(0);
    });

    it('only labels', () => {
      const result = prepareLabels({ labels: ['labelA', 'labelB'] });
      expect(result).toBeArrayOfSize(2);
      expect(result).toEqual(['labelA', 'labelB']);
    });

    it('only addLabels', () => {
      const result = prepareLabels({
        addLabels: ['labelA', 'labelB'],
      });
      expect(result).toBeArrayOfSize(2);
      expect(result).toEqual(['labelA', 'labelB']);
    });

    it('merge labels and addLabels', () => {
      const result = prepareLabels({
        labels: ['labelA', 'labelB'],
        addLabels: ['labelC'],
      });
      expect(result).toBeArrayOfSize(3);
      expect(result).toEqual(['labelA', 'labelB', 'labelC']);
    });

    it('deduplicate merged labels and addLabels', () => {
      const result = prepareLabels({
        labels: ['labelA', 'labelB'],
        addLabels: ['labelB', 'labelC'],
      });
      expect(result).toBeArrayOfSize(3);
      expect(result).toEqual(['labelA', 'labelB', 'labelC']);
    });

    it('empty labels ignored', () => {
      const result = prepareLabels({
        labels: ['labelA', ''],
        addLabels: [' ', 'labelB'],
      });
      expect(result).toBeArrayOfSize(2);
      expect(result).toEqual(['labelA', 'labelB']);
    });

    it('null labels ignored', () => {
      // TODO #22198
      const result = prepareLabels({
        labels: ['labelA', null] as never,
        // an empty space between two commas in an array is categorized as a null value
        // eslint-disable-next-line no-sparse-arrays
        addLabels: ['labelB', '', undefined, , ,] as never,
      });
      expect(result).toBeArrayOfSize(2);
      expect(result).toEqual(['labelA', 'labelB']);
    });

    it('template labels', () => {
      const result = prepareLabels({
        labels: ['datasource-{{{datasource}}}'],
        datasource: 'npm',
      });
      expect(result).toBeArrayOfSize(1);
      expect(result).toEqual(['datasource-npm']);
    });

    it('template labels with empty datasource', () => {
      const result = prepareLabels({
        labels: ['{{{datasource}}}', ' {{{datasource}}} '],
        datasource: null,
      });
      expect(result).toBeArrayOfSize(0);
      expect(result).toEqual([]);
    });

    describe('trim labels that go over the max char limit', () => {
      const labels = [
        'All',
        'The quick brown fox jumped over the lazy sleeping dog', // len: 51
        // len: 256
        'Torem ipsum dolor sit amet, consectetur adipiscing elit. Sed fringilla erat eu lectus gravida varius. Maecenas suscipit risus nec erat mollis tempus. Vestibulum cursus urna et faucibus tempor. Nam eleifend libero in enim sodales, eu placerat enim dice rep!',
      ];

      it('github', () => {
        expect(prepareLabels({ labels })).toEqual([
          'All',
          'The quick brown fox jumped over the lazy sleeping', // len: 50
          'Torem ipsum dolor sit amet, consectetur adipiscing', // len: 50
        ]);
      });

      it('gitlab', () => {
        vi.spyOn(platform, 'labelCharLimit').mockImplementationOnce(() => {
          return 255;
        });
        // platform.labelCharLimit.mockReturnValueOnce(255);
        expect(prepareLabels({ labels })).toEqual([
          'All',
          'The quick brown fox jumped over the lazy sleeping dog', // len: 51
          // len: 255
          'Torem ipsum dolor sit amet, consectetur adipiscing elit. Sed fringilla erat eu lectus gravida varius. Maecenas suscipit risus nec erat mollis tempus. Vestibulum cursus urna et faucibus tempor. Nam eleifend libero in enim sodales, eu placerat enim dice rep',
        ]);
      });

      it('gitea', () => {
        expect(prepareLabels({ labels })).toEqual([
          'All',
          'The quick brown fox jumped over the lazy sleeping', // len: 50
          'Torem ipsum dolor sit amet, consectetur adipiscing', // len: 50
        ]);
      });
    });
  });

  describe('getChangedLabels', () => {
    it('adds new labels', () => {
      expect(getChangedLabels(['npm'], ['node', 'npm'])).toEqual([
        ['node'],
        [],
      ]);
    });

    it('removes old labels', () => {
      expect(getChangedLabels(['node', 'npm'], ['npm'])).toEqual([
        [],
        ['node'],
      ]);
    });
  });

  describe('areLabelsModified', () => {
    it('returns true', () => {
      expect(areLabelsModified(['npm', 'node'], ['npm'])).toBeTrue();
    });

    it('returns false', () => {
      expect(areLabelsModified(['node', 'npm'], ['node', 'npm'])).toBeFalse();
      expect(areLabelsModified([], [])).toBeFalse();
    });
  });

  describe('shouldUpdateLabels', () => {
    it('returns true', () => {
      expect(
        shouldUpdateLabels(['npm', 'node'], ['npm', 'node'], ['npm']),
      ).toBeTrue();
      expect(
        shouldUpdateLabels(['npm', 'node'], ['npm', 'node'], undefined),
      ).toBeTrue();
      expect(shouldUpdateLabels([], [], ['npm', 'node'])).toBeTrue();
    });

    it('returns false if no labels found in debugData', () => {
      expect(
        shouldUpdateLabels(undefined, ['npm', 'node'], ['npm', 'node']),
      ).toBeFalse();
    });

    it('returns false if labels have been modified by user', () => {
      expect(shouldUpdateLabels(['npm', 'node'], ['npm'], ['npm'])).toBeFalse();
    });

    it('returns false if labels are not changed', () => {
      expect(
        shouldUpdateLabels(['npm', 'node'], ['npm', 'node'], ['npm', 'node']),
      ).toBeFalse();
    });
  });
});
