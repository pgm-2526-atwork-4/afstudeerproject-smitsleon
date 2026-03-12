import { FavouritesScreen } from '@/components/design/FavouritesScreen';
import { useLocalSearchParams } from 'expo-router';

export default function FavouriteArtistsScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  return (
    <FavouritesScreen
      config={{
        title: 'Favoriete artiesten',
        favouriteTable: 'favourite_artists',
        entityTable: 'artists',
        fkColumn: 'artist_id',
        entitySelect: 'id, name, image_url, genre',
        mapEntity: (entity) => ({
          id: entity.id,
          name: entity.name,
          subtitle: entity.genre ?? null,
          image_url: entity.image_url ?? null,
          isFavourite: true,
        }),
        onPress: (item, router) =>
          router.push({ pathname: '/artist/[id]', params: { id: item.id, name: item.name, imageUrl: item.image_url ?? '', genre: item.subtitle ?? '' } }),
        filterPlaceholder: 'Filter artiesten...',
        emptySubtitle: 'Zoek een artiest en voeg ze toe aan je favorieten.',
        userId,
      }}
    />
  );
}
