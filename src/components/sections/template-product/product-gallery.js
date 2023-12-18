import { h, render, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export const ProductGallery = () => {
  const product = window.product;
  const [selected, setSelected] = useState(product.media[0]);

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <>
      <div className="flex flex-col-reverse">
        {/* Image selector */}
        <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
          <div className="grid grid-cols-4 gap-6">
            {product.media.map(image => (
              <div
                key={image.id}
                className={classNames(
                  selected.id == image.id
                    ? 'text-secondaryColor border-indigo-600'
                    : 'text-headerColor border-transparent',
                  'flex-1 whitespace-nowrap py-4 px-1 border-b-2 text-base font-medium',
                  'relative h-24 bg-white rounded-medium flex items-center justify-center text-sm font-medium uppercase text-headerColor cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-offset-4 focus:ring-opacity-50',
                )}
                onClick={() => setSelected(image)}
              >
                <>
                  <span className="absolute inset-0 rounded-medium overflow-hidden">
                    <img
                      src={image.src}
                      alt=""
                      className="w-full h-full object-center object-cover"
                    />
                  </span>
                </>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full aspect-w-1 aspect-h-1">
          <img
            src={selected.src}
            className="w-full h-full object-center object-cover sm:rounded-large"
          />
        </div>
      </div>
    </>
  );
};

render(<ProductGallery />, document.getElementById('product-gallery'));
