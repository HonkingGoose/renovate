import { getPkgReleases } from '..';
import { EXTERNAL_HOST_ERROR } from '../../../constants/error-messages';
import { GalaxyDatasource } from '.';
import { Fixtures } from '~test/fixtures';
import * as httpMock from '~test/http-mock';

const baseUrl = 'https://galaxy.ansible.com/';

describe('modules/datasource/galaxy/index', () => {
  describe('getReleases', () => {
    it('returns null for empty result', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=non_existent_crate&name=undefined')
        .reply(200);
      expect(
        await getPkgReleases({
          datasource: GalaxyDatasource.id,
          packageName: 'non_existent_crate',
        }),
      ).toBeNull();
    });

    it('returns null for missing fields', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=non_existent_crate&name=undefined')
        .reply(200, undefined);
      expect(
        await getPkgReleases({
          datasource: GalaxyDatasource.id,
          packageName: 'non_existent_crate',
        }),
      ).toBeNull();
    });

    it('returns null for empty list', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=non_existent_crate&name=undefined')
        .reply(200, '\n');
      expect(
        await getPkgReleases({
          datasource: GalaxyDatasource.id,
          packageName: 'non_existent_crate',
        }),
      ).toBeNull();
    });

    it('returns null for 404', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=some_crate&name=undefined')
        .reply(404);
      expect(
        await getPkgReleases({
          datasource: GalaxyDatasource.id,
          packageName: 'some_crate',
        }),
      ).toBeNull();
    });

    it('returns null for unknown error', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=some_crate&name=undefined')
        .replyWithError('some unknown error');
      expect(
        await getPkgReleases({
          datasource: GalaxyDatasource.id,
          packageName: 'some_crate',
        }),
      ).toBeNull();
    });

    it('processes real data', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=yatesr&name=timezone')
        .reply(200, Fixtures.get('timezone.json'));
      const res = await getPkgReleases({
        datasource: GalaxyDatasource.id,
        packageName: 'yatesr.timezone',
      });
      expect(res).toMatchSnapshot();
      expect(res).not.toBeNull();
      expect(res).toBeDefined();
    });

    it('handles multiple results when one user matches exactly', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=datadog&name=datadog')
        .reply(200, Fixtures.get('datadog.json'));
      const res = await getPkgReleases({
        datasource: GalaxyDatasource.id,
        packageName: 'datadog.datadog',
      });
      expect(res).not.toBeNull();
      expect(res?.releases).toHaveLength(11);
    });

    it('rejects multiple results when no user matches exactly', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=nope&name=nope')
        .reply(200, Fixtures.get('datadog.json'));
      const res = await getPkgReleases({
        datasource: GalaxyDatasource.id,
        packageName: 'nope.nope',
      });
      expect(res).toBeNull();
    });

    it('return null if searching random username and project name', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=foo&name=bar')
        .reply(200, Fixtures.get('empty'));
      const res = await getPkgReleases({
        datasource: GalaxyDatasource.id,
        packageName: 'foo.bar',
      });
      expect(res).toBeNull();
    });

    it('throws for 5xx', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=some_crate&name=undefined')
        .reply(502);
      await expect(
        getPkgReleases({
          datasource: GalaxyDatasource.id,
          packageName: 'some_crate',
        }),
      ).rejects.toThrow(EXTERNAL_HOST_ERROR);
    });

    it('throws for 404', async () => {
      httpMock
        .scope(baseUrl)
        .get('/api/v1/roles/?owner__username=foo&name=bar')
        .reply(404);
      const res = await getPkgReleases({
        datasource: GalaxyDatasource.id,
        packageName: 'foo.bar',
      });
      expect(res).toBeNull();
    });
  });
});
