#!/bin/bash
BLOCKS="paragraph heading list list-item quote pullquote code preformatted verse image gallery video audio cover embed columns column group separator spacer table details button buttons file query post-template post-title post-excerpt post-date post-featured-image post-terms post-author post-content query-title query-pagination query-pagination-next query-pagination-previous query-pagination-numbers query-no-results latest-posts categories tag-cloud rss search html"
BLOG=astro-starter/src/styles/theme-blog.css
TECH=astro-starter/src/styles/theme-tech.css
DOCS=astro-starter/src/styles/theme-docs.css
BASE=astro-starter/src/styles/core-blocks.css
printf "%-32s | %5s | %5s | %5s | %5s | %s\n" "block" "blog" "tech" "docs" "base" "verdict"
printf "%s\n" "----------------------------------------------------------------------------"
for b in $BLOCKS; do
  sel=".wp-block-$b"
  # Match selector at word boundary: followed by space, {, :, ,, > or . or [ or newline, but NOT another word char
  pat="\\${sel}([^A-Za-z0-9_-]|\$)"
  bg=$(grep -Ec "$pat" "$BLOG" 2>/dev/null || echo 0)
  tg=$(grep -Ec "$pat" "$TECH" 2>/dev/null || echo 0)
  dg=$(grep -Ec "$pat" "$DOCS" 2>/dev/null || echo 0)
  bs=$(grep -Ec "$pat" "$BASE" 2>/dev/null || echo 0)
  verdict="NO"
  if [ "$bg" -gt 0 ] && [ "$tg" -gt 0 ] && [ "$dg" -gt 0 ]; then
    verdict="YES(all-3)"
  elif [ "$bs" -gt 0 ] && ([ "$bg" -gt 0 ] || [ "$tg" -gt 0 ] || [ "$dg" -gt 0 ]); then
    verdict="PARTIAL(base+some)"
  elif [ "$bs" -gt 0 ]; then
    verdict="BASE-ONLY"
  fi
  printf "%-32s | %5s | %5s | %5s | %5s | %s\n" "$b" "$bg" "$tg" "$dg" "$bs" "$verdict"
done
